-- activity: general-purpose social activity log
-- TTL culling is handled by a scheduled job on created_at.
-- payload holds IDs only — names are joined at query time.

create table public.activity (
  id         bigserial primary key,
  user_id    uuid not null references public.users(id) on delete cascade,
  type       text not null check (type in ('cooked', 'planned', 'family_cooked')),
  payload    jsonb,
  created_at timestamptz not null default now()
);

create index activity_user_created_idx on public.activity (user_id, created_at desc);
-- Feed queries order by created_at across all visible users, so a global index helps.
create index activity_created_idx on public.activity (created_at desc);

-- activity_likes: one row per (activity, liker). PK prevents double-likes.
create table public.activity_likes (
  activity_id bigint not null references public.activity(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (activity_id, user_id)
);

-- activity_privacy: opt-out of appearing in the public feed.
-- Default is 'public' (opt-out model) to maximise feed content at launch.
alter table public.users
  add column if not exists activity_privacy text not null default 'public'
    check (activity_privacy in ('public', 'friends_only'));

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.activity enable row level security;
alter table public.activity_likes enable row level security;

-- Own rows: always readable and insertable.
create policy "activity_select_own"
  on public.activity for select
  using (auth.uid() = user_id);

create policy "activity_insert_own"
  on public.activity for insert
  with check (auth.uid() = user_id);

-- Friends' rows: visible regardless of their privacy setting.
create policy "activity_select_friends"
  on public.activity for select
  using (
    exists (
      select 1 from public.friendships
      where (requester_id = auth.uid() and addressee_id = activity.user_id)
         or (addressee_id = auth.uid() and requester_id = activity.user_id)
    )
  );

-- Public rows: visible to any authenticated user when the author has opted in.
create policy "activity_select_public"
  on public.activity for select
  using (
    exists (
      select 1 from public.users u
      where u.id = activity.user_id
        and u.activity_privacy = 'public'
    )
  );

-- Family rows: visible to members of the same family (family_cooked type).
create policy "activity_select_family"
  on public.activity for select
  using (
    type = 'family_cooked'
    and exists (
      select 1 from public.family_members fm1
      join public.family_members fm2 on fm1.family_id = fm2.family_id
      where fm1.user_id = auth.uid()
        and fm2.user_id = activity.user_id
    )
  );

-- activity_likes: any authenticated user can read (counts aren't sensitive).
create policy "activity_likes_select"
  on public.activity_likes for select
  using (auth.uid() is not null);

-- activity_likes: own insert and delete only.
create policy "activity_likes_insert_own"
  on public.activity_likes for insert
  with check (auth.uid() = user_id);

create policy "activity_likes_delete_own"
  on public.activity_likes for delete
  using (auth.uid() = user_id);
