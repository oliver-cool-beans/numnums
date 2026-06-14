-- Switch recipe identity from external_id to slug.
-- Re-points all FK references to the keeper row before deleting slug duplicates.

create temp table _slug_dedup as
with ranked as (
  select
    id,
    first_value(id) over (
      partition by source, slug
      order by updated_at desc, id
    ) as keeper_id,
    row_number() over (
      partition by source, slug
      order by updated_at desc, id
    ) as rn
  from public.recipes
  where slug is not null
)
select id as dup_id, keeper_id from ranked where rn > 1;

-- Re-point meal plan day columns
update public.user_meal_plans set monday_recipe_id    = m.keeper_id from _slug_dedup m where monday_recipe_id    = m.dup_id;
update public.user_meal_plans set tuesday_recipe_id   = m.keeper_id from _slug_dedup m where tuesday_recipe_id   = m.dup_id;
update public.user_meal_plans set wednesday_recipe_id = m.keeper_id from _slug_dedup m where wednesday_recipe_id = m.dup_id;
update public.user_meal_plans set thursday_recipe_id  = m.keeper_id from _slug_dedup m where thursday_recipe_id  = m.dup_id;
update public.user_meal_plans set friday_recipe_id    = m.keeper_id from _slug_dedup m where friday_recipe_id    = m.dup_id;
update public.user_meal_plans set saturday_recipe_id  = m.keeper_id from _slug_dedup m where saturday_recipe_id  = m.dup_id;
update public.user_meal_plans set sunday_recipe_id    = m.keeper_id from _slug_dedup m where sunday_recipe_id    = m.dup_id;

-- Re-point swap suggestions
update public.recipe_swap_suggestions set current_recipe_id  = m.keeper_id from _slug_dedup m where current_recipe_id  = m.dup_id;
update public.recipe_swap_suggestions set proposed_recipe_id = m.keeper_id from _slug_dedup m where proposed_recipe_id = m.dup_id;

-- Re-point cooking progress
update public.user_recipe_progress p
set recipe_id = m.keeper_id
from _slug_dedup m
where p.recipe_id = m.dup_id
  and not exists (
    select 1 from public.user_recipe_progress p2
    where p2.user_id = p.user_id and p2.recipe_id = m.keeper_id
  );

-- Delete duplicates — cascades to recipe_steps, recipe_ingredient_links, etc.
delete from public.recipes where id in (select dup_id from _slug_dedup);

drop table _slug_dedup;

drop index if exists public.recipes_slug_idx;
create unique index if not exists recipes_source_slug_idx
  on public.recipes (source, slug);
