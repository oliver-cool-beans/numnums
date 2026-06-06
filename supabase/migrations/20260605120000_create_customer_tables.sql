-- Customer-facing meal planning and shopping tables

-- user_meal_plans: Weekly meal assignments per user
CREATE TABLE IF NOT EXISTS public.user_meal_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  year integer NOT NULL,
  monday_recipe_id uuid NOT NULL REFERENCES public.recipes(id),
  tuesday_recipe_id uuid NOT NULL REFERENCES public.recipes(id),
  wednesday_recipe_id uuid NOT NULL REFERENCES public.recipes(id),
  thursday_recipe_id uuid NOT NULL REFERENCES public.recipes(id),
  friday_recipe_id uuid NOT NULL REFERENCES public.recipes(id),
  saturday_recipe_id uuid NULL REFERENCES public.recipes(id),
  sunday_recipe_id uuid NULL REFERENCES public.recipes(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_number, year)
);

CREATE INDEX idx_user_meal_plans_user_id ON public.user_meal_plans(user_id);
CREATE INDEX idx_user_meal_plans_week ON public.user_meal_plans(week_number, year);

-- user_recipe_progress: Cooking progress tracking per recipe
CREATE TABLE IF NOT EXISTS public.user_recipe_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  current_step_number integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at timestamp with time zone NULL,
  completed_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

CREATE INDEX idx_user_recipe_progress_user_id ON public.user_recipe_progress(user_id);
CREATE INDEX idx_user_recipe_progress_status ON public.user_recipe_progress(status);

-- shopping_lists: Customer shopping list records
CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  meal_plan_id uuid NOT NULL REFERENCES public.user_meal_plans(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'completed')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  confirmed_at timestamp with time zone NULL,
  completed_at timestamp with time zone NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_shopping_lists_user_id ON public.shopping_lists(user_id);
CREATE INDEX idx_shopping_lists_status ON public.shopping_lists(status);

-- shopping_list_items: Line items for shopping lists
CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shopping_list_id uuid NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id),
  product_id uuid NULL REFERENCES public.products(id),
  quantity_needed decimal NOT NULL DEFAULT 1,
  quantity_purchased decimal NOT NULL DEFAULT 0,
  is_checked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_shopping_list_items_shopping_list ON public.shopping_list_items(shopping_list_id);
CREATE INDEX idx_shopping_list_items_ingredient ON public.shopping_list_items(ingredient_id);
