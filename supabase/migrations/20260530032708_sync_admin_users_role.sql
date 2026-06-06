create schema if not exists private;

revoke all on schema private from public;

create or replace function private.sync_public_user_from_auth()
returns trigger
language plpgsql
as $$
begin
	if new.email is null then
		return new;
	end if;

	insert into public.users (
		id,
		email,
		name,
		role,
		created_at,
		updated_at
	)
	values (
		new.id,
		new.email,
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
		coalesce((select users.role from public.users where users.id = new.id), 'user'),
		coalesce(new.created_at, timezone('utc', now())),
		timezone('utc', now())
	)
	on conflict (id) do update
	set email = excluded.email,
			name = coalesce(excluded.name, public.users.name),
			updated_at = timezone('utc', now());

	return new;
end;
$$;

drop trigger if exists sync_public_user_from_auth on auth.users;

create trigger sync_public_user_from_auth
after insert or update of email, raw_user_meta_data on auth.users
for each row
execute function private.sync_public_user_from_auth();

insert into public.users (
	id,
	email,
	name,
	role,
	plan,
	created_at,
	updated_at,
	last_seen_at
)
select
	auth_users.id,
	auth_users.email,
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
	coalesce(existing_users.role, 'user'),
	existing_users.plan,
	coalesce(existing_users.created_at, auth_users.created_at, timezone('utc', now())),
	timezone('utc', now()),
	existing_users.last_seen_at
from auth.users as auth_users
left join public.users as existing_users on existing_users.id = auth_users.id
where auth_users.email is not null
on conflict (id) do update
set email = excluded.email,
		name = coalesce(excluded.name, public.users.name),
		updated_at = timezone('utc', now());
