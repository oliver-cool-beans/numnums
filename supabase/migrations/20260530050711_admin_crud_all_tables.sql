grant insert, update, delete on table
	public.users,
	public.products,
	public.recipes,
	public.recipe_ingredients,
	public.ingredient_product_links,
	public.ingredient_match_suggestions,
	public.ingredient_review_queue,
	public.import_runs
to authenticated;

-- These grants only expose write operations to signed-in sessions.
-- Admin authorization is enforced by the policies below via public.users.role = 'admin'.

drop policy if exists users_admin_select on public.users;
create policy users_admin_select on public.users
for select to authenticated
using (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists users_admin_insert on public.users;
create policy users_admin_insert on public.users
for insert to authenticated
with check (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists users_admin_update on public.users;
create policy users_admin_update on public.users
for update to authenticated
using (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
)
with check (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists users_admin_delete on public.users;
create policy users_admin_delete on public.users
for delete to authenticated
using (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists products_admin_insert on public.products;
create policy products_admin_insert on public.products
for insert to authenticated
with check (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists products_admin_update on public.products;
create policy products_admin_update on public.products
for update to authenticated
using (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
)
with check (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists products_admin_delete on public.products;
create policy products_admin_delete on public.products
for delete to authenticated
using (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists recipes_admin_insert on public.recipes;
create policy recipes_admin_insert on public.recipes
for insert to authenticated
with check (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists recipes_admin_update on public.recipes;
create policy recipes_admin_update on public.recipes
for update to authenticated
using (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
)
with check (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists recipes_admin_delete on public.recipes;
create policy recipes_admin_delete on public.recipes
for delete to authenticated
using (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists recipe_ingredients_admin_insert on public.recipe_ingredients;
create policy recipe_ingredients_admin_insert on public.recipe_ingredients
for insert to authenticated
with check (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists recipe_ingredients_admin_update on public.recipe_ingredients;
create policy recipe_ingredients_admin_update on public.recipe_ingredients
for update to authenticated
using (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
)
with check (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists recipe_ingredients_admin_delete on public.recipe_ingredients;
create policy recipe_ingredients_admin_delete on public.recipe_ingredients
for delete to authenticated
using (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists ingredient_product_links_admin_insert on public.ingredient_product_links;
create policy ingredient_product_links_admin_insert on public.ingredient_product_links
for insert to authenticated
with check (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists ingredient_product_links_admin_update on public.ingredient_product_links;
create policy ingredient_product_links_admin_update on public.ingredient_product_links
for update to authenticated
using (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
)
with check (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists ingredient_product_links_admin_delete on public.ingredient_product_links;
create policy ingredient_product_links_admin_delete on public.ingredient_product_links
for delete to authenticated
using (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists ingredient_match_suggestions_admin_insert on public.ingredient_match_suggestions;
create policy ingredient_match_suggestions_admin_insert on public.ingredient_match_suggestions
for insert to authenticated
with check (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists ingredient_match_suggestions_admin_update on public.ingredient_match_suggestions;
create policy ingredient_match_suggestions_admin_update on public.ingredient_match_suggestions
for update to authenticated
using (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
)
with check (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists ingredient_match_suggestions_admin_delete on public.ingredient_match_suggestions;
create policy ingredient_match_suggestions_admin_delete on public.ingredient_match_suggestions
for delete to authenticated
using (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists ingredient_review_queue_admin_insert on public.ingredient_review_queue;
create policy ingredient_review_queue_admin_insert on public.ingredient_review_queue
for insert to authenticated
with check (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists ingredient_review_queue_admin_update on public.ingredient_review_queue;
create policy ingredient_review_queue_admin_update on public.ingredient_review_queue
for update to authenticated
using (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
)
with check (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists ingredient_review_queue_admin_delete on public.ingredient_review_queue;
create policy ingredient_review_queue_admin_delete on public.ingredient_review_queue
for delete to authenticated
using (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists import_runs_admin_insert on public.import_runs;
create policy import_runs_admin_insert on public.import_runs
for insert to authenticated
with check (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists import_runs_admin_update on public.import_runs;
create policy import_runs_admin_update on public.import_runs
for update to authenticated
using (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
)
with check (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);

drop policy if exists import_runs_admin_delete on public.import_runs;
create policy import_runs_admin_delete on public.import_runs
for delete to authenticated
using (
	exists (
		select 1
		from public.users as admin_user
		where admin_user.id = (select auth.uid())
			and admin_user.role = 'admin'
	)
);
