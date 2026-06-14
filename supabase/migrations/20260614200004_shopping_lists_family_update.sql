-- Family members can tick items but couldn't complete/uncomplete the list
-- because shopping_lists_update only allows auth.uid() = user_id (owner).
-- completeList, uncompleteList, and quickComplete all write to shopping_lists
-- status — this policy extends UPDATE to family members.

CREATE POLICY shopping_lists_update_family_member
  ON public.shopping_lists
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members owner_fm
      JOIN public.family_members member_fm ON member_fm.family_id = owner_fm.family_id
      WHERE owner_fm.user_id = shopping_lists.user_id
        AND owner_fm.role = 'owner'
        AND member_fm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.family_members owner_fm
      JOIN public.family_members member_fm ON member_fm.family_id = owner_fm.family_id
      WHERE owner_fm.user_id = shopping_lists.user_id
        AND owner_fm.role = 'owner'
        AND member_fm.user_id = auth.uid()
    )
  );
