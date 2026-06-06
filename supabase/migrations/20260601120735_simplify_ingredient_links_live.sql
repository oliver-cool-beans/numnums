delete from public.ingredient_product_links
where status = 'rejected';

update public.ingredient_product_links
set created_by_user_id = coalesce(created_by_user_id, approved_by_user_id)
where created_by_user_id is null;

drop index if exists public.ingredient_product_links_status_idx;

alter table public.ingredient_product_links
	drop column if exists status,
	drop column if exists approved_by_user_id,
	drop column if exists approved_at;

drop table if exists public.ingredient_review_queue;
