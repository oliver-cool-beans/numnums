alter table public.ingredients
add column if not exists is_pantry boolean not null default false;

update public.ingredients
set is_pantry = true
where handle = any(
	array[
		'water',
		'salt',
		'pepper',
		'olive-oil',
		'vegetable-oil',
		'plain-flour',
		'cornflour',
		'sugar',
		'brown-sugar',
		'baking-powder',
		'bicarbonate-of-soda'
	]
);
