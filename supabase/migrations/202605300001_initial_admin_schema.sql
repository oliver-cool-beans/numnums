create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  name text,
  role text not null default 'user',
  plan text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text not null,
  name text not null,
  brand text,
  category text,
  price_cents integer,
  selling_size text,
  selling_unit text,
  image_url text,
  available boolean not null default true,
  raw_json jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists products_source_external_id_idx
  on public.products (source, external_id);
create index if not exists products_source_idx on public.products (source);
create index if not exists products_source_available_idx on public.products (source, available);
create index if not exists products_name_idx on public.products (name);
create index if not exists products_category_idx on public.products (category);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text not null,
  name text not null,
  slug text,
  headline text,
  image_url text,
  website_url text,
  servings integer,
  prep_minutes integer,
  cook_minutes integer,
  difficulty integer,
  raw_json jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists recipes_source_external_id_idx
  on public.recipes (source, external_id);
create index if not exists recipes_source_idx on public.recipes (source);
create index if not exists recipes_slug_idx on public.recipes (slug);
create index if not exists recipes_name_idx on public.recipes (name);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  source text not null,
  raw_name text not null,
  handle text not null,
  quantity numeric,
  unit text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists recipe_ingredients_recipe_id_idx on public.recipe_ingredients (recipe_id);
create index if not exists recipe_ingredients_source_handle_idx
  on public.recipe_ingredients (source, handle);
create index if not exists recipe_ingredients_handle_idx on public.recipe_ingredients (handle);
create index if not exists recipe_ingredients_raw_name_idx on public.recipe_ingredients (raw_name);

create table if not exists public.ingredient_product_links (
  id uuid primary key default gen_random_uuid(),
  ingredient_source text not null,
  ingredient_handle text not null,
  product_id uuid not null references public.products (id) on delete cascade,
  priority integer not null default 0,
  status text not null default 'pending',
  notes text,
  approved_by_user_id uuid references public.users (id),
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists ingredient_product_links_source_handle_idx
  on public.ingredient_product_links (ingredient_source, ingredient_handle);
create index if not exists ingredient_product_links_handle_idx
  on public.ingredient_product_links (ingredient_handle);
create index if not exists ingredient_product_links_product_idx
  on public.ingredient_product_links (product_id);
create index if not exists ingredient_product_links_status_idx
  on public.ingredient_product_links (status);
create unique index if not exists ingredient_product_links_unique_match_idx
  on public.ingredient_product_links (ingredient_source, ingredient_handle, product_id);

create table if not exists public.ingredient_match_suggestions (
  id uuid primary key default gen_random_uuid(),
  ingredient_source text not null,
  ingredient_handle text not null,
  product_id uuid not null references public.products (id) on delete cascade,
  confidence numeric(5, 4),
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ingredient_match_suggestions_source_handle_idx
  on public.ingredient_match_suggestions (ingredient_source, ingredient_handle);
create index if not exists ingredient_match_suggestions_product_idx
  on public.ingredient_match_suggestions (product_id);
create index if not exists ingredient_match_suggestions_confidence_idx
  on public.ingredient_match_suggestions (confidence);
create unique index if not exists ingredient_match_suggestions_unique_idx
  on public.ingredient_match_suggestions (ingredient_source, ingredient_handle, product_id);

create table if not exists public.ingredient_review_queue (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  raw_name text not null,
  handle text not null,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists ingredient_review_queue_status_idx on public.ingredient_review_queue (status);
create index if not exists ingredient_review_queue_source_handle_idx
  on public.ingredient_review_queue (source, handle);
create unique index if not exists ingredient_review_queue_source_raw_name_idx
  on public.ingredient_review_queue (source, raw_name);

create table if not exists public.import_runs (
  id uuid primary key default gen_random_uuid(),
  import_type text not null,
  status text not null,
  records_seen integer,
  records_inserted integer,
  records_updated integer,
  error_message text,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists import_runs_type_started_at_idx
  on public.import_runs (import_type, started_at desc);
create index if not exists users_plan_idx on public.users (plan);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

drop trigger if exists set_recipes_updated_at on public.recipes;
create trigger set_recipes_updated_at
before update on public.recipes
for each row
execute function public.set_updated_at();

drop trigger if exists set_recipe_ingredients_updated_at on public.recipe_ingredients;
create trigger set_recipe_ingredients_updated_at
before update on public.recipe_ingredients
for each row
execute function public.set_updated_at();

drop trigger if exists set_ingredient_product_links_updated_at on public.ingredient_product_links;
create trigger set_ingredient_product_links_updated_at
before update on public.ingredient_product_links
for each row
execute function public.set_updated_at();

drop trigger if exists set_ingredient_review_queue_updated_at on public.ingredient_review_queue;
create trigger set_ingredient_review_queue_updated_at
before update on public.ingredient_review_queue
for each row
execute function public.set_updated_at();