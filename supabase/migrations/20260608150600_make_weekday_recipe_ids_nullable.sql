-- Days are entirely opt-in: a user may plan as few or as many dinners as they like,
-- so weekday recipe slots can no longer be mandatory (previously only Sat/Sun were nullable).

ALTER TABLE public.user_meal_plans
  ALTER COLUMN monday_recipe_id DROP NOT NULL,
  ALTER COLUMN tuesday_recipe_id DROP NOT NULL,
  ALTER COLUMN wednesday_recipe_id DROP NOT NULL,
  ALTER COLUMN thursday_recipe_id DROP NOT NULL,
  ALTER COLUMN friday_recipe_id DROP NOT NULL;
