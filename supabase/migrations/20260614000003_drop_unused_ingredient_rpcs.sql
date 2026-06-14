-- Drop count_unlinked_ingredients and list_unlinked_ingredients.
--
-- Both were superseded by unmatched_ingredients_count() and
-- unmatched_ingredients() (20260614000000_unmatched_ingredients_rpc.sql),
-- which add `id` and `recipe_link_count` columns to the result,
-- filter out pantry ingredients, and use NOT EXISTS rather than a lateral
-- join so they hit the existing ingredient_product_links(ingredient_id) index.

drop function if exists public.count_unlinked_ingredients();
drop function if exists public.list_unlinked_ingredients(integer);
