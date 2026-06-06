create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
	select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

alter table public.users
	alter column email drop not null;

create or replace function private.sync_public_user_from_auth()
returns trigger
language plpgsql
as $$
begin
	insert into public.users (
		id,
		name,
		created_at,
		updated_at
	)
	values (
		new.id,
		nullif(
			trim(
				coalesce(
					new.raw_user_meta_data ->> 'name',
					new.raw_user_meta_data ->> 'full_name',
					''
				)
			),
			''
		),
		coalesce(new.created_at, timezone('utc', now())),
		timezone('utc', now())
	)
	on conflict (id) do update
	set name = coalesce(excluded.name, public.users.name),
			updated_at = timezone('utc', now());

	return new;
end;
$$;

drop trigger if exists sync_public_user_from_auth on auth.users;

create trigger sync_public_user_from_auth
after insert or update of raw_user_meta_data on auth.users
for each row
execute function private.sync_public_user_from_auth();

insert into public.users (
	id,
	name,
	plan,
	created_at,
	updated_at,
	last_seen_at
)
select
	auth_users.id,
	nullif(
		trim(
			coalesce(
				auth_users.raw_user_meta_data ->> 'name',
				auth_users.raw_user_meta_data ->> 'full_name',
				''
			)
		),
		''
	),
	existing_users.plan,
	coalesce(existing_users.created_at, auth_users.created_at, timezone('utc', now())),
	timezone('utc', now()),
	existing_users.last_seen_at
from auth.users as auth_users
left join public.users as existing_users on existing_users.id = auth_users.id
on conflict (id) do update
set name = coalesce(excluded.name, public.users.name),
		updated_at = timezone('utc', now());

revoke insert, update, delete on table public.users from authenticated;

drop policy if exists users_admin_select on public.users;
drop policy if exists users_admin_insert on public.users;
drop policy if exists users_admin_update on public.users;
drop policy if exists users_admin_delete on public.users;
drop policy if exists users_select_own_or_admin on public.users;
drop policy if exists users_select_own on public.users;

create policy users_select_own on public.users
for select to authenticated
using (
	(select auth.uid()) is not null
	and (select auth.uid()) = id
);

drop policy if exists products_admin_select on public.products;
create policy products_admin_select on public.products
for select to authenticated
using (public.is_admin());

drop policy if exists products_admin_insert on public.products;
create policy products_admin_insert on public.products
for insert to authenticated
with check (public.is_admin());

drop policy if exists products_admin_update on public.products;
create policy products_admin_update on public.products
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists products_admin_delete on public.products;
create policy products_admin_delete on public.products
for delete to authenticated
using (public.is_admin());

drop policy if exists recipes_admin_select on public.recipes;
create policy recipes_admin_select on public.recipes
for select to authenticated
using (public.is_admin());

drop policy if exists recipes_admin_insert on public.recipes;
create policy recipes_admin_insert on public.recipes
for insert to authenticated
with check (public.is_admin());

drop policy if exists recipes_admin_update on public.recipes;
create policy recipes_admin_update on public.recipes
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists recipes_admin_delete on public.recipes;
create policy recipes_admin_delete on public.recipes
for delete to authenticated
using (public.is_admin());

drop policy if exists recipe_ingredients_admin_select on public.recipe_ingredients;
create policy recipe_ingredients_admin_select on public.recipe_ingredients
for select to authenticated
using (public.is_admin());

drop policy if exists recipe_ingredients_admin_insert on public.recipe_ingredients;
create policy recipe_ingredients_admin_insert on public.recipe_ingredients
for insert to authenticated
with check (public.is_admin());

drop policy if exists recipe_ingredients_admin_update on public.recipe_ingredients;
create policy recipe_ingredients_admin_update on public.recipe_ingredients
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists recipe_ingredients_admin_delete on public.recipe_ingredients;
create policy recipe_ingredients_admin_delete on public.recipe_ingredients
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

drop policy if exists ingredient_match_suggestions_admin_select on public.ingredient_match_suggestions;
create policy ingredient_match_suggestions_admin_select on public.ingredient_match_suggestions
for select to authenticated
using (public.is_admin());

drop policy if exists ingredient_match_suggestions_admin_insert on public.ingredient_match_suggestions;
create policy ingredient_match_suggestions_admin_insert on public.ingredient_match_suggestions
for insert to authenticated
with check (public.is_admin());

drop policy if exists ingredient_match_suggestions_admin_update on public.ingredient_match_suggestions;
create policy ingredient_match_suggestions_admin_update on public.ingredient_match_suggestions
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists ingredient_match_suggestions_admin_delete on public.ingredient_match_suggestions;
create policy ingredient_match_suggestions_admin_delete on public.ingredient_match_suggestions
for delete to authenticated
using (public.is_admin());

drop policy if exists ingredient_review_queue_admin_select on public.ingredient_review_queue;
create policy ingredient_review_queue_admin_select on public.ingredient_review_queue
for select to authenticated
using (public.is_admin());

drop policy if exists ingredient_review_queue_admin_insert on public.ingredient_review_queue;
create policy ingredient_review_queue_admin_insert on public.ingredient_review_queue
for insert to authenticated
with check (public.is_admin());

drop policy if exists ingredient_review_queue_admin_update on public.ingredient_review_queue;
create policy ingredient_review_queue_admin_update on public.ingredient_review_queue
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists ingredient_review_queue_admin_delete on public.ingredient_review_queue;
create policy ingredient_review_queue_admin_delete on public.ingredient_review_queue
for delete to authenticated
using (public.is_admin());

drop policy if exists import_runs_admin_select on public.import_runs;
create policy import_runs_admin_select on public.import_runs
for select to authenticated
using (public.is_admin());

drop policy if exists import_runs_admin_insert on public.import_runs;
create policy import_runs_admin_insert on public.import_runs
for insert to authenticated
with check (public.is_admin());

drop policy if exists import_runs_admin_update on public.import_runs;
create policy import_runs_admin_update on public.import_runs
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists import_runs_admin_delete on public.import_runs;
create policy import_runs_admin_delete on public.import_runs
for delete to authenticated
using (public.is_admin());

alter table public.users
drop column if exists role;
