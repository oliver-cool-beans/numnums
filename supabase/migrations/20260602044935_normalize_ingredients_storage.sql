drop table if exists public.ingredient_product_links;
drop table if exists public.recipe_facets;
drop table if exists public.recipe_ingredients;

create table if not exists public.ingredients (
	id uuid primary key default gen_random_uuid(),
	source text not null,
	handle text not null,
	image_url text,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	unique (source, handle)
);

create index if not exists ingredients_source_handle_idx on public.ingredients (source, handle);
create index if not exists ingredients_handle_idx on public.ingredients (handle);

create table if not exists public.recipe_ingredient_links (
	id uuid primary key default gen_random_uuid(),
	recipe_id uuid not null references public.recipes (id) on delete cascade,
	ingredient_id uuid not null references public.ingredients (id) on delete cascade,
	quantity numeric,
	unit text,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	unique (recipe_id, ingredient_id)
);

create index if not exists recipe_ingredient_links_recipe_id_idx on public.recipe_ingredient_links (recipe_id);
create index if not exists recipe_ingredient_links_ingredient_id_idx on public.recipe_ingredient_links (ingredient_id);

create table if not exists public.ingredient_product_links (
	id uuid primary key default gen_random_uuid(),
	ingredient_id uuid not null references public.ingredients (id) on delete cascade,
	product_id uuid not null references public.products (id) on delete cascade,
	priority integer not null default 0,
	notes text,
	created_by_user_id uuid references public.users (id),
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	unique (ingredient_id, product_id)
);

create index if not exists ingredient_product_links_ingredient_id_idx on public.ingredient_product_links (ingredient_id);
create index if not exists ingredient_product_links_product_idx on public.ingredient_product_links (product_id);

grant usage on schema public to authenticated;

grant all privileges on table
	public.ingredients,
	public.recipe_ingredient_links,
	public.ingredient_product_links
to service_role;

grant select, insert, update, delete on table
	public.ingredients,
	public.recipe_ingredient_links,
	public.ingredient_product_links
to authenticated;

revoke all on table
	public.ingredients,
	public.recipe_ingredient_links,
	public.ingredient_product_links
from anon;

alter table public.ingredients enable row level security;
alter table public.recipe_ingredient_links enable row level security;
alter table public.ingredient_product_links enable row level security;

drop policy if exists ingredients_admin_select on public.ingredients;
create policy ingredients_admin_select on public.ingredients
for select to authenticated
using (public.is_admin());

drop policy if exists ingredients_admin_insert on public.ingredients;
create policy ingredients_admin_insert on public.ingredients
for insert to authenticated
with check (public.is_admin());

drop policy if exists ingredients_admin_update on public.ingredients;
create policy ingredients_admin_update on public.ingredients
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists ingredients_admin_delete on public.ingredients;
create policy ingredients_admin_delete on public.ingredients
for delete to authenticated
using (public.is_admin());

drop policy if exists recipe_ingredient_links_admin_select on public.recipe_ingredient_links;
create policy recipe_ingredient_links_admin_select on public.recipe_ingredient_links
for select to authenticated
using (public.is_admin());

drop policy if exists recipe_ingredient_links_admin_insert on public.recipe_ingredient_links;
create policy recipe_ingredient_links_admin_insert on public.recipe_ingredient_links
for insert to authenticated
with check (public.is_admin());

drop policy if exists recipe_ingredient_links_admin_update on public.recipe_ingredient_links;
create policy recipe_ingredient_links_admin_update on public.recipe_ingredient_links
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists recipe_ingredient_links_admin_delete on public.recipe_ingredient_links;
create policy recipe_ingredient_links_admin_delete on public.recipe_ingredient_links
for delete to authenticated
using (public.is_admin());

drop policy if exists ingredient_product_links_admin_select on public.ingredient_product_links;
create policy ingredient_product_links_admin_select on public.ingredient_product_links
for select to authenticated
using (public.is_admin());

drop policy if exists ingredient_product_links_admin_insert on public.ingredient_product_links;
create policy ingredient_product_links_admin_insert on public.ingredient_product_links
for insert to authenticated
with check (public.is_admin());

drop policy if exists ingredient_product_links_admin_update on public.ingredient_product_links;
create policy ingredient_product_links_admin_update on public.ingredient_product_links
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists ingredient_product_links_admin_delete on public.ingredient_product_links;
create policy ingredient_product_links_admin_delete on public.ingredient_product_links
for delete to authenticated
using (public.is_admin());

drop trigger if exists set_ingredients_updated_at on public.ingredients;
create trigger set_ingredients_updated_at
before update on public.ingredients
for each row
execute function public.set_updated_at();

drop trigger if exists set_recipe_ingredient_links_updated_at on public.recipe_ingredient_links;
create trigger set_recipe_ingredient_links_updated_at
before update on public.recipe_ingredient_links
for each row
execute function public.set_updated_at();

drop trigger if exists set_ingredient_product_links_updated_at on public.ingredient_product_links;
create trigger set_ingredient_product_links_updated_at
before update on public.ingredient_product_links
for each row
execute function public.set_updated_at();
