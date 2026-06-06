grant usage on schema public to service_role;

grant all privileges on table
  public.users,
  public.products,
  public.recipes,
  public.recipe_ingredients,
  public.ingredient_product_links,
  public.ingredient_match_suggestions,
  public.ingredient_review_queue,
  public.import_runs
to service_role;

grant all privileges on all sequences in schema public to service_role;

alter default privileges in schema public
grant all on tables to service_role;

alter default privileges in schema public
grant all on sequences to service_role;