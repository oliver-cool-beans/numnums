-- Replace list_unlinked_ingredients / count_unlinked_ingredients with
-- unmatched_ingredients / unmatched_ingredients_count.
--
-- The old functions used a LEFT JOIN LATERAL to test for missing product
-- links, which caused PostgREST to emit a pattern that bypassed the
-- ingredient_product_links(ingredient_id) index and scanned the whole table.
-- Using NOT EXISTS lets Postgres short-circuit as soon as one matching link
-- is found, hitting the index directly.
--
-- Changes vs. old functions:
--   • Filters out pantry ingredients (is_pantry = false).
--   • Returns `id` so callers can build detail-page links.
--   • Returns `recipe_link_count` (recipe uses, not raw link rows).
--   • Pagination via p_limit / p_offset instead of a single limit arg.
--   • SECURITY DEFINER so the query can bypass RLS when called from an
--     authenticated session — both functions are read-only and expose
--     no PII beyond what the admin app already sees.

create or replace function public.unmatched_ingredients(
  p_limit  int default 25,
  p_offset int default 0
)
returns table (
  id               uuid,
  source           text,
  handle           text,
  updated_at       timestamptz,
  recipe_link_count bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    i.id,
    i.source,
    i.handle,
    i.updated_at,
    count(ril.id) as recipe_link_count
  from ingredients i
  left join recipe_ingredient_links ril on ril.ingredient_id = i.id
  where i.is_pantry = false
    and not exists (
      select 1 from ingredient_product_links ipl
      where ipl.ingredient_id = i.id
    )
  group by i.id, i.source, i.handle, i.updated_at
  order by i.updated_at desc
  limit p_limit
  offset p_offset;
$$;

create or replace function public.unmatched_ingredients_count()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*)
  from public.ingredients
  where is_pantry = false
    and not exists (
      select 1 from public.ingredient_product_links ipl
      where ipl.ingredient_id = ingredients.id
    );
$$;

grant execute on function public.unmatched_ingredients(int, int)  to authenticated, service_role;
grant execute on function public.unmatched_ingredients_count()    to authenticated, service_role;
