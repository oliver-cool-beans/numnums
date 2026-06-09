-- Families, friendships, and invite links
--
-- Kept deliberately small: no redundant owner pointers (the owner is just the
-- family_members row with role = 'owner') and no duplicated bookkeeping on
-- invites (who/when accepted is already recorded by the resulting membership
-- row's user_id/created_at).

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

-- Membership in a family. The owner is the row with role = 'owner'; members
-- can suggest/vote but not edit the plan directly.
create table if not exists public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (family_id, user_id)
);

create index if not exists family_members_user_id_idx on public.family_members (user_id);

-- Friendships are mutual once formed; a single row per pair is enough since
-- both sides reach an 'accepted' state atomically when an invite is redeemed
-- (there is no pending-request state to track).
create table if not exists public.friendships (
  requester_id uuid not null references public.users (id) on delete cascade,
  addressee_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create index if not exists friendships_addressee_id_idx on public.friendships (addressee_id);

-- Invite links. The token redeemed by the recipient is a signed JWT (see
-- lib/invite-token.ts) carrying just this row's id and its own exp claim;
-- this row is the source of truth for consumption/revocation so a link can
-- only be redeemed once.
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('family', 'friend')),
  inviter_id uuid not null references public.users (id) on delete cascade,
  family_id uuid references public.families (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  check (kind <> 'family' or family_id is not null)
);

create index if not exists invites_inviter_id_idx on public.invites (inviter_id);

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.friendships enable row level security;
alter table public.invites enable row level security;

-- families: visible to members; no direct insert/update policy is needed
-- since families are created via create_family() below.
create policy families_select ON public.families
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = id AND fm.user_id = auth.uid()
    )
  );

-- family_members: visible to other members of the same family; only the
-- family owner can add or remove members directly (invite acceptance uses a
-- security-definer function to bypass this for the invited user themselves).
create policy family_members_select ON public.family_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = family_members.family_id AND fm.user_id = auth.uid()
    )
  );

create policy family_members_owner_manage ON public.family_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.family_members owner_row
      WHERE owner_row.family_id = family_members.family_id
        AND owner_row.user_id = auth.uid()
        AND owner_row.role = 'owner'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.family_members owner_row
      WHERE owner_row.family_id = family_members.family_id
        AND owner_row.user_id = auth.uid()
        AND owner_row.role = 'owner'
    )
  );

-- friendships: visible to and removable by either side of the relationship
create policy friendships_select ON public.friendships
  FOR SELECT USING (auth.uid() IN (requester_id, addressee_id));

create policy friendships_delete ON public.friendships
  FOR DELETE USING (auth.uid() IN (requester_id, addressee_id));

-- invites: an inviter can see and manage invites they created; the table is
-- otherwise not browsable. The public preview/accept flow goes through the
-- security-definer functions below, not direct table access.
create policy invites_select_own ON public.invites
  FOR SELECT USING (inviter_id = auth.uid());

create policy invites_insert_own ON public.invites
  FOR INSERT WITH CHECK (inviter_id = auth.uid());

create policy invites_revoke_own ON public.invites
  FOR UPDATE USING (inviter_id = auth.uid() AND status = 'pending')
  WITH CHECK (inviter_id = auth.uid() AND status = 'revoked');

-- Creates a family with the caller as its owner in one step, so there is
-- never a moment where a family exists without an owner membership row.
create or replace function public.create_family(family_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id uuid;
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'must be authenticated to create a family';
  end if;

  insert into public.families (name) values (family_name)
  returning id into new_family_id;

  insert into public.family_members (family_id, user_id, role)
  values (new_family_id, caller, 'owner');

  return new_family_id;
end;
$$;

grant execute on function public.create_family(text) to authenticated;

-- Narrow, audited lookup for the public invite-preview page: returns just the
-- inviter's display info and invite kind/family name for a given invite id,
-- regardless of who is asking (including anonymous visitors). It deliberately
-- does not expose tokens or any other invite rows.
create or replace function public.get_invite_preview(invite_id uuid)
returns table (
  kind text,
  inviter_name text,
  family_name text,
  status text,
  expires_at timestamptz
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
    i.expires_at
  from public.invites i
  join public.users u on u.id = i.inviter_id
  left join public.families f on f.id = i.family_id
  where i.id = invite_id;
$$;

grant execute on function public.get_invite_preview(uuid) to anon, authenticated;

-- Accepts an invite on behalf of the currently-authenticated user. Performs
-- the join (family membership or friendship) and marks the invite consumed,
-- all under one definer so the acceptor doesn't need direct write access to
-- family_members/friendships/invites for someone else's invite.
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

  if inv.status <> 'pending' then
    raise exception 'invite is no longer available';
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

  update public.invites set status = 'accepted' where id = invite_id;
end;
$$;

grant execute on function public.accept_invite(uuid) to authenticated;
