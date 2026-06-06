do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'recipes'
      and column_name = 'cook_minutes'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'recipes'
      and column_name = 'total_minutes'
  ) then
    alter table public.recipes rename column cook_minutes to total_minutes;
  end if;
end
$$;

alter table public.recipes
  add column if not exists description text,
  add column if not exists category text,
  add column if not exists country text,
  add column if not exists total_minutes integer,
  add column if not exists average_rating numeric(6, 2),
  add column if not exists ratings_count integer,
  add column if not exists favorites_count integer,
  add column if not exists serving_size integer,
  add column if not exists unique_recipe_code text,
  add column if not exists is_active boolean not null default true,
  add column if not exists is_published boolean not null default false,
  add column if not exists is_addon boolean not null default false,
  add column if not exists source_created_at timestamptz,
  add column if not exists source_updated_at timestamptz;

alter table public.recipes
  drop column if exists raw_json,
  drop column if exists cook_minutes;

create index if not exists recipes_source_country_idx on public.recipes (source, country);
create index if not exists recipes_unique_recipe_code_idx on public.recipes (unique_recipe_code);

alter table public.recipe_ingredients
  add column if not exists external_id text,
  add column if not exists external_uuid text,
  add column if not exists ingredient_type text,
  add column if not exists ingredient_slug text,
  add column if not exists ingredient_image_url text,
  add column if not exists ingredient_country text,
  add column if not exists shipped boolean not null default false,
  add column if not exists family_name text,
  add column if not exists family_slug text,
  add column if not exists family_type text;

create index if not exists recipe_ingredients_external_id_idx on public.recipe_ingredients (external_id);
create index if not exists recipe_ingredients_slug_idx on public.recipe_ingredients (ingredient_slug);

create table if not exists public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  step_number integer not null,
  instructions text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (recipe_id, step_number)
);

create index if not exists recipe_steps_recipe_id_idx on public.recipe_steps (recipe_id);

create table if not exists public.recipe_nutrition (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  sort_order integer not null,
  nutrient_type text,
  nutrient_name text not null,
  amount numeric,
  unit text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (recipe_id, sort_order)
);

create index if not exists recipe_nutrition_recipe_id_idx on public.recipe_nutrition (recipe_id);

create table if not exists public.recipe_facets (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  facet_kind text not null,
  external_id text not null,
  facet_type text,
  name text not null,
  slug text,
  icon_url text,
  color_handle text,
  display_label boolean,
  traces_of boolean,
  triggers_traces_of boolean,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint recipe_facets_kind_check check (facet_kind in ('allergen', 'cuisine', 'tag')),
  unique (recipe_id, facet_kind, external_id)
);

create index if not exists recipe_facets_recipe_id_idx on public.recipe_facets (recipe_id);
create index if not exists recipe_facets_kind_slug_idx on public.recipe_facets (facet_kind, slug);

grant all privileges on table
  public.recipe_steps,
  public.recipe_nutrition,
  public.recipe_facets
to service_role;

grant select, insert, update, delete on table
  public.recipe_steps,
  public.recipe_nutrition,
  public.recipe_facets
to authenticated;

revoke all on table
  public.recipe_steps,
  public.recipe_nutrition,
  public.recipe_facets
from anon;

alter table public.recipe_steps enable row level security;
alter table public.recipe_nutrition enable row level security;
alter table public.recipe_facets enable row level security;

drop policy if exists recipe_steps_admin_select on public.recipe_steps;
create policy recipe_steps_admin_select on public.recipe_steps
for select to authenticated
using (public.is_admin());

drop policy if exists recipe_steps_admin_insert on public.recipe_steps;
create policy recipe_steps_admin_insert on public.recipe_steps
for insert to authenticated
with check (public.is_admin());

drop policy if exists recipe_steps_admin_update on public.recipe_steps;
create policy recipe_steps_admin_update on public.recipe_steps
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists recipe_steps_admin_delete on public.recipe_steps;
create policy recipe_steps_admin_delete on public.recipe_steps
for delete to authenticated
using (public.is_admin());

drop policy if exists recipe_nutrition_admin_select on public.recipe_nutrition;
create policy recipe_nutrition_admin_select on public.recipe_nutrition
for select to authenticated
using (public.is_admin());

drop policy if exists recipe_nutrition_admin_insert on public.recipe_nutrition;
create policy recipe_nutrition_admin_insert on public.recipe_nutrition
for insert to authenticated
with check (public.is_admin());

drop policy if exists recipe_nutrition_admin_update on public.recipe_nutrition;
create policy recipe_nutrition_admin_update on public.recipe_nutrition
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists recipe_nutrition_admin_delete on public.recipe_nutrition;
create policy recipe_nutrition_admin_delete on public.recipe_nutrition
for delete to authenticated
using (public.is_admin());

drop policy if exists recipe_facets_admin_select on public.recipe_facets;
create policy recipe_facets_admin_select on public.recipe_facets
for select to authenticated
using (public.is_admin());

drop policy if exists recipe_facets_admin_insert on public.recipe_facets;
create policy recipe_facets_admin_insert on public.recipe_facets
for insert to authenticated
with check (public.is_admin());

drop policy if exists recipe_facets_admin_update on public.recipe_facets;
create policy recipe_facets_admin_update on public.recipe_facets
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists recipe_facets_admin_delete on public.recipe_facets;
create policy recipe_facets_admin_delete on public.recipe_facets
for delete to authenticated
using (public.is_admin());