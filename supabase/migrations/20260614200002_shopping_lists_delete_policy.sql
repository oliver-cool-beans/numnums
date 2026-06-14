-- 1. shopping_lists was missing a DELETE policy, causing replaceShoppingList()
--    to silently fail: RLS blocked the delete, no error was returned, and every
--    regeneration stacked a new list on top of the old ones.
--
-- Cleanup: remove all but the most-recently-created list per meal plan, then
-- add the policy so future regenerations delete correctly.

DELETE FROM public.shopping_lists
WHERE id NOT IN (
  SELECT DISTINCT ON (meal_plan_id) id
  FROM public.shopping_lists
  ORDER BY meal_plan_id, created_at DESC
);

CREATE POLICY "shopping_lists_delete"
  ON public.shopping_lists
  FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Family members can view the owner's shopping list items (SELECT policy
--    already exists in 20260613000001) but were blocked from ticking them off.
--    Allow UPDATE so members can check/uncheck items while shopping together.

CREATE POLICY shopping_list_items_update_family_member
  ON public.shopping_list_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      JOIN public.family_members owner_fm ON owner_fm.user_id = sl.user_id
        AND owner_fm.role = 'owner'
      JOIN public.family_members member_fm ON member_fm.family_id = owner_fm.family_id
        AND member_fm.user_id = auth.uid()
      WHERE sl.id = shopping_list_items.shopping_list_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      JOIN public.family_members owner_fm ON owner_fm.user_id = sl.user_id
        AND owner_fm.role = 'owner'
      JOIN public.family_members member_fm ON member_fm.family_id = owner_fm.family_id
        AND member_fm.user_id = auth.uid()
      WHERE sl.id = shopping_list_items.shopping_list_id
    )
  );
