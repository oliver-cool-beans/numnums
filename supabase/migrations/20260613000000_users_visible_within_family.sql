-- Allow family members to see each other's display names.
--
-- The previous policy (users_select_own) meant that when the groups page or
-- useFamilyContext queried family_members with an embedded users join, members
-- could not read each other's name column. This caused two bugs:
--   1. Groups page showed "Member" for everyone except the viewer themselves.
--   2. useFamilyContext queried family_members + users for the owner row; when
--      the owner's users row was filtered by RLS the result depended on whether
--      PostgREST produced a LEFT or INNER join — in the INNER case the entire
--      family_members row disappeared, making the non-owner member appear to
--      have no family context on their dashboard (triggering the onboarding
--      flow instead of showing the owner's meal plan).
--
-- The helper function avoids inline subqueries against family_members inside
-- the policy, preventing the RLS-recursion issue that existed before
-- 20260608150300_fix_family_members_rls_recursion.sql.

create or replace function public.shares_family_with(p_user_id uuid, p_viewer_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm1
    join public.family_members fm2 using (family_id)
    where fm1.user_id = p_user_id
      and fm2.user_id = p_viewer_id
  );
$$;

grant execute on function public.shares_family_with(uuid, uuid) to authenticated;

drop policy if exists users_select_own on public.users;

create policy users_select_own_or_family on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or public.shares_family_with(id, auth.uid())
  );
