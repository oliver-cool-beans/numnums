grant usage on schema public to authenticated;

grant select on table
  public.products,
  public.recipes,
  public.recipe_ingredients,
  public.ingredient_product_links,
  public.ingredient_match_suggestions,
  public.ingredient_review_queue,
  public.import_runs,
  public.users
to authenticated;

revoke all on table
  public.products,
  public.recipes,
  public.recipe_ingredients,
  public.ingredient_product_links,
  public.ingredient_match_suggestions,
  public.ingredient_review_queue,
  public.import_runs,
  public.users
from anon;

alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.ingredient_product_links enable row level security;
alter table public.ingredient_match_suggestions enable row level security;
alter table public.ingredient_review_queue enable row level security;
alter table public.import_runs enable row level security;

drop policy if exists users_select_own_or_admin on public.users;
create policy users_select_own_or_admin on public.users
for select to authenticated
using (
  (select auth.uid()) = id
  or public.is_admin()
);

drop policy if exists products_admin_select on public.products;
create policy products_admin_select on public.products
for select to authenticated
using (public.is_admin());

drop policy if exists recipes_admin_select on public.recipes;
create policy recipes_admin_select on public.recipes
for select to authenticated
using (public.is_admin());

drop policy if exists recipe_ingredients_admin_select on public.recipe_ingredients;
create policy recipe_ingredients_admin_select on public.recipe_ingredients
for select to authenticated
using (public.is_admin());

drop policy if exists ingredient_product_links_admin_select on public.ingredient_product_links;
create policy ingredient_product_links_admin_select on public.ingredient_product_links
for select to authenticated
using (public.is_admin());

drop policy if exists ingredient_match_suggestions_admin_select on public.ingredient_match_suggestions;
create policy ingredient_match_suggestions_admin_select on public.ingredient_match_suggestions
for select to authenticated
using (public.is_admin());

drop policy if exists ingredient_review_queue_admin_select on public.ingredient_review_queue;
create policy ingredient_review_queue_admin_select on public.ingredient_review_queue
for select to authenticated
using (public.is_admin());

drop policy if exists import_runs_admin_select on public.import_runs;
create policy import_runs_admin_select on public.import_runs
for select to authenticated
using (public.is_admin());