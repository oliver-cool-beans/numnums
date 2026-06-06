create or replace function private.sync_public_user_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
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

insert into public.users (
	id,
	name,
	created_at,
	updated_at
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
	coalesce(auth_users.created_at, timezone('utc', now())),
	timezone('utc', now())
from auth.users as auth_users
left join public.users as existing_users on existing_users.id = auth_users.id
where existing_users.id is null
on conflict (id) do nothing;
