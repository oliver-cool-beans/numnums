create index if not exists recipe_ingredients_updated_at_idx
  on public.recipe_ingredients (updated_at desc);