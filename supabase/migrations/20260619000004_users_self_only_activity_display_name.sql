-- Tighten users visibility and denormalize display names into activity rows.
--
-- Problem: the previous policy allowed any user to query the entire users table
-- for rows where activity_privacy = 'public'. Users should only ever be able
-- to read their own row.
--
-- Solution:
--   1. Revert users SELECT to self-only.
--   2. Add actor_display_name to activity so the feed never needs a users join.
--   3. Fix activity_select_public — it checked users.activity_privacy, which
--      would silently stop working with self-only users RLS. A tiny
--      security-definer helper bypasses the row restriction for that one check.

-- 1. Self-only users SELECT — no browsing other users' rows.
drop policy if exists users_select_own_family_friend_or_public on public.users;
drop policy if exists users_select_own_or_family on public.users;
drop policy if exists users_select_own on public.users;

create policy users_select_own on public.users
  for select to authenticated
  using (id = auth.uid());

-- 2. Store the actor's first name on every activity row.
alter table public.activity
  add column if not exists actor_display_name text;

-- Backfill existing rows (migration runs with elevated privileges).
update public.activity a
set actor_display_name = trim(split_part(coalesce(u.name, ''), ' ', 1))
from public.users u
where a.user_id = u.id
  and a.actor_display_name is null;

-- 3. Security-definer helper so activity_select_public can check a user's
--    privacy setting without going through the now-restricted users table.
create or replace function public.user_activity_privacy(p_user_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select activity_privacy from public.users where id = p_user_id;
$$;

grant execute on function public.user_activity_privacy(uuid) to authenticated;

drop policy if exists activity_select_public on public.activity;

create policy activity_select_public on public.activity
  for select
  using (public.user_activity_privacy(user_id) = 'public');
