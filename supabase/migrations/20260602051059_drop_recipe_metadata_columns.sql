drop index if exists public.recipes_source_country_idx;
drop index if exists public.recipes_unique_recipe_code_idx;

alter table public.recipes
	drop column if exists average_rating,
	drop column if exists ratings_count,
	drop column if exists favorites_count,
	drop column if exists unique_recipe_code,
	drop column if exists is_published,
	drop column if exists is_active,
	drop column if exists is_addon,
	drop column if exists source_created_at,
	drop column if exists source_updated_at,
	drop column if exists category,
	drop column if exists country;
