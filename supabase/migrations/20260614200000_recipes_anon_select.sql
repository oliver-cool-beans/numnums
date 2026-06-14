-- Allow anonymous visitors to read the recipes catalogue.
-- Recipes are public EveryPlate content shown on the marketing home page.
-- IMPORTANT: never add user-identifiable or sensitive columns to this table
-- while this policy is in place — they would be exposed to unauthenticated users.
CREATE POLICY recipes_select_anon ON public.recipes
  FOR SELECT TO anon
  USING (true);
