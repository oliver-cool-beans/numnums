alter table public.users
drop constraint if exists users_email_key;

alter table public.users
drop column if exists email;

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

drop policy if exists users_select_own_or_admin on public.users;
drop policy if exists users_select_own on public.users;

create policy users_select_own on public.users
for select to authenticated
using (
	(select auth.uid()) is not null
	and (select auth.uid()) = id
);