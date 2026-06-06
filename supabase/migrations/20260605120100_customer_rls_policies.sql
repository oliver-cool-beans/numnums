-- Customer RLS policies and recipe/product access

-- Enable RLS on all customer tables
ALTER TABLE public.user_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recipe_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

-- user_meal_plans: Users can only read/write their own
CREATE POLICY user_meal_plans_select ON public.user_meal_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_meal_plans_insert ON public.user_meal_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_meal_plans_update ON public.user_meal_plans
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_recipe_progress: Users can only read/write their own
CREATE POLICY user_recipe_progress_select ON public.user_recipe_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_recipe_progress_insert ON public.user_recipe_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_recipe_progress_update ON public.user_recipe_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- shopping_lists: Users can only read/write their own
CREATE POLICY shopping_lists_select ON public.shopping_lists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY shopping_lists_insert ON public.shopping_lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY shopping_lists_update ON public.shopping_lists
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- shopping_list_items: Users can manage items for their own lists
CREATE POLICY shopping_list_items_select ON public.shopping_list_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      WHERE sl.id = shopping_list_id AND sl.user_id = auth.uid()
    )
  );

CREATE POLICY shopping_list_items_insert ON public.shopping_list_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      WHERE sl.id = shopping_list_id AND sl.user_id = auth.uid()
    )
  );

CREATE POLICY shopping_list_items_update ON public.shopping_list_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      WHERE sl.id = shopping_list_id AND sl.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      WHERE sl.id = shopping_list_id AND sl.user_id = auth.uid()
    )
  );

-- Expose recipes to authenticated users (currently admin-only)
-- Admin policies already exist; add customer-facing SELECT policy
CREATE POLICY recipes_select_authenticated ON public.recipes
  FOR SELECT USING (auth.role() = 'authenticated');

-- Expose ingredients to authenticated users
CREATE POLICY ingredients_select_authenticated ON public.ingredients
  FOR SELECT USING (auth.role() = 'authenticated');

-- Expose products to authenticated users
CREATE POLICY products_select_authenticated ON public.products
  FOR SELECT USING (auth.role() = 'authenticated');

-- Expose recipe_ingredient_links to authenticated users
CREATE POLICY recipe_ingredient_links_select ON public.recipe_ingredient_links
  FOR SELECT USING (auth.role() = 'authenticated');

-- Expose ingredient_product_links to authenticated users
CREATE POLICY ingredient_product_links_select ON public.ingredient_product_links
  FOR SELECT USING (auth.role() = 'authenticated');

-- Expose recipe_steps to authenticated users
CREATE POLICY recipe_steps_select ON public.recipe_steps
  FOR SELECT USING (auth.role() = 'authenticated');
