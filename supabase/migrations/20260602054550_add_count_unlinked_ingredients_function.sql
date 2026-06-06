create or replace function public.count_unlinked_ingredients()
returns bigint
language sql
stable
security invoker
set search_path = public
as $$
	select count(*)
	from public.ingredients ingredient
	where not exists (
		select 1
		from public.ingredient_product_links ingredient_link
		where ingredient_link.ingredient_id = ingredient.id
	);
$$;

create or replace function public.list_unlinked_ingredients(limit_count integer default 25)
returns table (
	source text,
	handle text,
	updated_at timestamptz,
	pending_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
	select
		ingredient.source,
		ingredient.handle,
		ingredient.updated_at,
		count(recipe_ingredient_link.id) as pending_count
	from public.ingredients ingredient
	left join public.recipe_ingredient_links recipe_ingredient_link
		on recipe_ingredient_link.ingredient_id = ingredient.id
	where not exists (
		select 1
		from public.ingredient_product_links ingredient_link
		where ingredient_link.ingredient_id = ingredient.id
	)
	group by ingredient.id, ingredient.source, ingredient.handle, ingredient.updated_at
	order by ingredient.updated_at desc
	limit limit_count;
$$;

grant execute on function public.count_unlinked_ingredients() to authenticated;
grant execute on function public.count_unlinked_ingredients() to service_role;
grant execute on function public.list_unlinked_ingredients(integer) to authenticated;
grant execute on function public.list_unlinked_ingredients(integer) to service_role;
