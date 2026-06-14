-- Revoke now deletes the row; accept now deletes the row too.
-- status column is unused, so drop it along with the old update policy.

drop policy invites_revoke_own ON public.invites;

create policy invites_delete_own ON public.invites
  FOR DELETE USING (inviter_id = auth.uid());

alter table public.invites drop column status;

-- accept_invite: delete the row instead of marking it accepted.
-- Double-acceptance is prevented by the row no longer existing.
create or replace function public.accept_invite(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  acceptor uuid := auth.uid();
begin
  if acceptor is null then
    raise exception 'must be authenticated to accept an invite';
  end if;

  select * into inv from public.invites where id = invite_id for update;

  if not found then
    raise exception 'invite not found';
  end if;

  if inv.expires_at <= timezone('utc', now()) then
    raise exception 'invite has expired';
  end if;

  if inv.inviter_id = acceptor then
    raise exception 'cannot accept your own invite';
  end if;

  if inv.kind = 'family' then
    insert into public.family_members (family_id, user_id, role)
    values (inv.family_id, acceptor, 'member')
    on conflict (family_id, user_id) do nothing;
  else
    insert into public.friendships (requester_id, addressee_id)
    values (inv.inviter_id, acceptor)
    on conflict (requester_id, addressee_id) do nothing;
  end if;

  delete from public.invites where id = invite_id;
end;
$$;

-- get_invite_preview: drop status from the result set
drop function if exists public.get_invite_preview(uuid);

create function public.get_invite_preview(invite_id uuid)
returns table (
  kind text,
  inviter_name text,
  family_name text,
  expires_at timestamptz,
  invitee_email text
)
language sql
security definer
set search_path = public
as $$
  select
    i.kind,
    u.name,
    f.name,
    i.expires_at,
    i.invitee_email
  from public.invites i
  join public.users u on u.id = i.inviter_id
  left join public.families f on f.id = i.family_id
  where i.id = invite_id;
$$;

grant execute on function public.get_invite_preview(uuid) to anon, authenticated;
