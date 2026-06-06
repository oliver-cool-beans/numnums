alter table public.recipes
  add column if not exists dietary_tags text[] not null default '{}';

create index if not exists recipes_dietary_tags_gin_idx
  on public.recipes using gin(dietary_tags);
