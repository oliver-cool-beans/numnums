-- Expose invitee_email on the invite preview so the accept flow can tell
-- whether the recipient's address is already known (email invite — go
-- straight to "send confirmation link") or needs to be collected (link/QR
-- invite — prompt for it before sending the same confirmation).
drop function if exists public.get_invite_preview(uuid);

create function public.get_invite_preview(invite_id uuid)
returns table (
  kind text,
  inviter_name text,
  family_name text,
  status text,
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
    i.status,
    i.expires_at,
    i.invitee_email
  from public.invites i
  join public.users u on u.id = i.inviter_id
  left join public.families f on f.id = i.family_id
  where i.id = invite_id;
$$;

grant execute on function public.get_invite_preview(uuid) to anon, authenticated;
