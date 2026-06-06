alter table public.ingredient_product_links
	add column if not exists created_by_user_id uuid references public.users (id);

update public.ingredient_product_links
set created_by_user_id = approved_by_user_id
where created_by_user_id is null
	and approved_by_user_id is not null;
