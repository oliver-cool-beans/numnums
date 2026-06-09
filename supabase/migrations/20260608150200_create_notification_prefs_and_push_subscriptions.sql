create table if not exists public.user_notification_preferences (
  user_id uuid primary key references public.users (id) on delete cascade,
  push_enabled boolean not null default false,
  email_enabled boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_notification_preferences enable row level security;

drop trigger if exists set_user_notification_preferences_updated_at on public.user_notification_preferences;
create trigger set_user_notification_preferences_updated_at
before update on public.user_notification_preferences
for each row
execute function public.set_updated_at();

drop policy if exists user_notification_preferences_select on public.user_notification_preferences;
create policy user_notification_preferences_select on public.user_notification_preferences
  for select using (auth.uid() = user_id);

drop policy if exists user_notification_preferences_insert on public.user_notification_preferences;
create policy user_notification_preferences_insert on public.user_notification_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists user_notification_preferences_update on public.user_notification_preferences;
create policy user_notification_preferences_update on public.user_notification_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select on public.push_subscriptions;
create policy push_subscriptions_select on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists push_subscriptions_insert on public.push_subscriptions;
create policy push_subscriptions_insert on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists push_subscriptions_delete on public.push_subscriptions;
create policy push_subscriptions_delete on public.push_subscriptions
  for delete using (auth.uid() = user_id);
