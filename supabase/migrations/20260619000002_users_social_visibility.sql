-- Extend users visibility for the social activity feed.
--
-- Previously users could only read their own row and family members' rows.
-- The activity feed needs to read names for:
--   1. Friends (to show "Jake cooked X")
--   2. Users with public activity (to show "Oliver cooked X" in the community feed)
--
-- A security-definer helper avoids RLS recursion on friendships.

create or replace function public.is_friends_with(p_user_id uuid, p_viewer_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.friendships
    where (requester_id = p_viewer_id and addressee_id = p_user_id)
       or (addressee_id = p_viewer_id and requester_id = p_user_id)
  );
$$;

grant execute on function public.is_friends_with(uuid, uuid) to authenticated;

drop policy if exists users_select_own_or_family on public.users;

create policy users_select_own_family_friend_or_public on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or public.shares_family_with(id, auth.uid())
    or public.is_friends_with(id, auth.uid())
    or activity_privacy = 'public'
  );
