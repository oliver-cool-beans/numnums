-- Lets family members see the family owner's weekly plan — the plan the
-- family collaboratively manages via recipe swap suggestions.
-- Additive to the existing owner-only SELECT policy — Postgres OR-combines
-- permissive policies, so this only widens read access, never narrows it.

create policy user_meal_plans_select_family_owner on public.user_meal_plans
  for select using (
    exists (
      select 1 from public.family_members owner_fm
      join public.family_members member_fm on member_fm.family_id = owner_fm.family_id
      where owner_fm.user_id = user_meal_plans.user_id
        and owner_fm.role = 'owner'
        and member_fm.user_id = auth.uid()
    )
  );
