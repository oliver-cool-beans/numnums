update public.ingredient_product_links
set
	status = 'approved',
	approved_at = coalesce(approved_at, updated_at, created_at, timezone('utc', now())),
	approved_by_user_id = coalesce(approved_by_user_id, created_by_user_id)
where status = 'pending';

update public.ingredient_review_queue as queue
set status = 'approved'
where queue.status = 'pending'
	and exists (
		select 1
		from public.ingredient_product_links as link
		where link.ingredient_source = queue.source
			and link.ingredient_handle = queue.handle
			and link.status = 'approved'
	);
