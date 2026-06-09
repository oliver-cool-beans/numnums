create table if not exists public.user_dietary_preferences (
  user_id uuid primary key references public.users (id) on delete cascade,
  preferences text[] not null default '{}',
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_dietary_preferences enable row level security;

drop trigger if exists set_user_dietary_preferences_updated_at on public.user_dietary_preferences;
create trigger set_user_dietary_preferences_updated_at
before update on public.user_dietary_preferences
for each row
execute function public.set_updated_at();

drop policy if exists user_dietary_preferences_select on public.user_dietary_preferences;
create policy user_dietary_preferences_select on public.user_dietary_preferences
  for select using (auth.uid() = user_id);

drop policy if exists user_dietary_preferences_insert on public.user_dietary_preferences;
create policy user_dietary_preferences_insert on public.user_dietary_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists user_dietary_preferences_update on public.user_dietary_preferences;
create policy user_dietary_preferences_update on public.user_dietary_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
