-- Allow family members to read the family owner's shopping list and its items.
-- Mirrors the meal-plan family policy (20260608150000): non-owner members
-- view the owner's shopping list so that "shop next week" shows the shared
-- plan's list rather than the member's own (empty) list.
--
-- SELECT only — members can also toggle items (UPDATE) because the existing
-- shopping_list_items UPDATE policy checks sl.user_id = auth.uid(), which
-- would still block them. That can be widened in a follow-up if needed.

create policy shopping_lists_select_family_owner on public.shopping_lists
  for select to authenticated
  using (
    exists (
      select 1 from public.family_members owner_fm
      join public.family_members member_fm on member_fm.family_id = owner_fm.family_id
      where owner_fm.user_id = shopping_lists.user_id
        and owner_fm.role = 'owner'
        and member_fm.user_id = auth.uid()
    )
  );

create policy shopping_list_items_select_family_owner on public.shopping_list_items
  for select to authenticated
  using (
    exists (
      select 1 from public.shopping_lists sl
      join public.family_members owner_fm on owner_fm.user_id = sl.user_id
        and owner_fm.role = 'owner'
      join public.family_members member_fm on member_fm.family_id = owner_fm.family_id
        and member_fm.user_id = auth.uid()
      where sl.id = shopping_list_items.shopping_list_id
    )
  );
