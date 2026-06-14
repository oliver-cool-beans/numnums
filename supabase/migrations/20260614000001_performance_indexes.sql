-- Performance indexes and ingredient_recipe_counts RPC.
--
-- Addresses slow queries identified via pg_stat_statements:
--
--   1. recipes ORDER BY updated_at DESC — full-seq-scan on ~N rows.
--   2. recipe_ingredient_links lookups per ingredient — no composite index.
--   3. products ILIKE name/brand searches — no trigram index.
--   4. ingredient-links page embedding recipe_ingredient_links inside the
--      ingredients lateral join — generates a nested lateral that re-scans
--      recipe_ingredient_links once per ingredient row. Replaced with a
--      single batched RPC (ingredient_recipe_counts) called after the page
--      fetch.

-- 1. recipes: fast ORDER BY updated_at DESC (recipe list, onboarding fetch)
create index if not exists recipes_updated_at_idx
  on public.recipes (updated_at desc);

-- 2. recipe_ingredient_links: fast lookup by ingredient, sorted by recency
create index if not exists recipe_ingredient_links_ingredient_updated_idx
  on public.recipe_ingredient_links (ingredient_id, updated_at desc);

-- 3. products: trigram index for ILIKE name searches (ingredient-link picker)
create extension if not exists pg_trgm;
create index if not exists products_name_trgm_idx
  on public.products using gin (name gin_trgm_ops);
create index if not exists products_updated_at_idx
  on public.products (updated_at desc);

-- 4. Batch recipe counts per ingredient.
--
-- Used by the admin ingredient-links page to show how many recipes reference
-- each ingredient. The previous approach embedded recipe_ingredient_links
-- inside the ingredients lateral join (one scan per ingredient row). This
-- RPC aggregates the whole page's ingredient IDs in a single query.
--
-- Called from: apps/admin/server/ingredients/ingredient-links.ts
create or replace function public.ingredient_recipe_counts(p_ingredient_ids uuid[])
returns table (
  ingredient_id uuid,
  recipe_count  bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select ingredient_id, count(*) as recipe_count
  from public.recipe_ingredient_links
  where ingredient_id = any(p_ingredient_ids)
  group by ingredient_id;
$$;

grant execute on function public.ingredient_recipe_counts(uuid[]) to authenticated, service_role;
