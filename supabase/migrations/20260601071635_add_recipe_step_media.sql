alter table public.recipe_steps
	add column if not exists image_assets jsonb not null default '[]'::jsonb,
	add column if not exists video_assets jsonb not null default '[]'::jsonb;
