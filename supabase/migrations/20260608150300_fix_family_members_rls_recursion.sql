-- The original family_members policies check membership/ownership via an
-- EXISTS subquery against family_members itself. Postgres has to re-apply the
-- same RLS policy to that inner reference, which re-triggers the subquery,
-- causing "infinite recursion detected in policy for relation family_members".
--
-- Fix: move the membership/ownership checks into SECURITY DEFINER functions.
-- Their internal queries run with the function owner's privileges (bypassing
-- RLS), so referencing family_members from within them does not re-trigger
-- the calling policy.

create or replace function public.is_family_member(p_family_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = p_family_id and user_id = p_user_id
  );
$$;

create or replace function public.is_family_owner(p_family_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = p_family_id and user_id = p_user_id and role = 'owner'
  );
$$;

drop policy if exists family_members_select on public.family_members;
create policy family_members_select on public.family_members
  for select using (
    user_id = auth.uid()
    or public.is_family_member(family_id, auth.uid())
  );

drop policy if exists family_members_owner_manage on public.family_members;
create policy family_members_owner_manage on public.family_members
  for all using (
    public.is_family_owner(family_id, auth.uid())
  ) with check (
    public.is_family_owner(family_id, auth.uid())
  );
