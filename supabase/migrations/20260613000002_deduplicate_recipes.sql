-- Remove duplicate recipes that share the same source and name.
-- Duplicates arise when the same recipe is imported multiple times with
-- different external_ids (e.g. after an EveryPlate ID change).
-- Keep the most recently updated row; delete the rest.
-- Cascades automatically to recipe_ingredient_links, shopping_list_items, etc.

with ranked as (
  select id,
         row_number() over (
           partition by source, lower(name)
           order by updated_at desc, id
         ) as rn
  from public.recipes
)
delete from public.recipes
where id in (select id from ranked where rn > 1);

-- Prevent future duplicates by enforcing uniqueness on (source, name).
create unique index if not exists recipes_source_name_lower_idx
  on public.recipes (source, lower(name));
