grant insert, update on table
	public.ingredient_product_links,
	public.ingredient_review_queue
to authenticated;

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
