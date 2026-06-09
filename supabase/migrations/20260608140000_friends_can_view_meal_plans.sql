-- Lets friends see what's on each other's menu (the dashboard "friends" block).
-- Additive to the existing owner-only SELECT policy — Postgres OR-combines
-- permissive policies, so this only widens read access, never narrows it.

create policy user_meal_plans_select_friends on public.user_meal_plans
  for select using (
    exists (
      select 1 from public.friendships f
      where (f.requester_id = auth.uid() and f.addressee_id = user_meal_plans.user_id)
         or (f.addressee_id = auth.uid() and f.requester_id = user_meal_plans.user_id)
    )
  );
