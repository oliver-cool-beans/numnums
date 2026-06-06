create or replace view public.recipe_admin_summaries
with (security_invoker = true)
as
select
	r.id,
	r.source,
	r.external_id,
	r.name,
	r.slug,
	r.headline,
	r.description,
	r.image_url,
	r.website_url,
	r.servings,
	r.prep_minutes,
	r.total_minutes,
	r.difficulty,
	r.serving_size,
	r.created_at,
	r.updated_at,
	coalesce(coverage.ingredient_count, 0)::integer as ingredient_count,
	coalesce(coverage.linked_ingredients, 0)::integer as linked_ingredients,
	coalesce(coverage.unlinked_ingredients, 0)::integer as unlinked_ingredients
from public.recipes as r
left join lateral (
	select
		count(*)::integer as ingredient_count,
		count(*) filter (
			where exists (
				select 1
				from public.ingredient_product_links as ipl
				where ipl.ingredient_id = ril.ingredient_id
			)
		)::integer as linked_ingredients,
		count(*) filter (
			where not exists (
				select 1
				from public.ingredient_product_links as ipl
				where ipl.ingredient_id = ril.ingredient_id
			)
		)::integer as unlinked_ingredients
	from public.recipe_ingredient_links as ril
	where ril.recipe_id = r.id
) as coverage on true;

grant select on public.recipe_admin_summaries to authenticated;
grant select on public.recipe_admin_summaries to service_role;
