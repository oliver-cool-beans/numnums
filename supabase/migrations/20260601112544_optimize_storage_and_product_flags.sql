alter table public.products
	add column if not exists discontinued boolean not null default false;

do $$
begin
	if exists (
		select 1
		from information_schema.columns
		where table_schema = 'public'
			and table_name = 'products'
			and column_name = 'raw_json'
	) then
		execute $sql$
			update public.products
			set discontinued = coalesce((raw_json ->> 'discontinued')::boolean, false)
			where raw_json is not null
		$sql$;
	end if;
end
$$;

delete from public.import_runs
where status = 'completed'
	and completed_at is not null
	and completed_at < now() - interval '30 days';

drop table if exists public.ingredient_match_suggestions;
drop table if exists public.recipe_nutrition;

with ranked_ingredients as (
	select
		id,
		row_number() over (
			partition by recipe_id, source,
			case when external_id is not null then external_id else handle end,
			(external_id is null)
			order by updated_at desc, created_at desc, id desc
		) as row_number
	from public.recipe_ingredients
)
delete from public.recipe_ingredients
where id in (
	select id
	from ranked_ingredients
	where row_number > 1
);

create unique index if not exists recipe_ingredients_recipe_source_external_id_unique_idx
	on public.recipe_ingredients (recipe_id, source, external_id)
	where external_id is not null;

create unique index if not exists recipe_ingredients_recipe_source_handle_unique_idx
	on public.recipe_ingredients (recipe_id, source, handle)
	where external_id is null;

alter table public.products
	drop column if exists raw_json;
