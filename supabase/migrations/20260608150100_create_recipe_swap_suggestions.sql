-- Recipe swap suggestions: how a family collaboratively manages its shared
-- weekly plan (the family owner's user_meal_plans row — see the
-- family_can_view_owner_meal_plans migration). Members can only suggest;
-- owners can suggest, approve (their own or others'), dismiss, or — outside
-- this table entirely — switch a recipe directly via a plain update to their
-- own plan.
--
-- This table doubles as the only "activity" record needed for now (no
-- separate notification system yet): visiting the family's plan shows what's
-- pending and who proposed it.

create table public.recipe_swap_suggestions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  meal_plan_owner_id uuid not null references public.users (id) on delete cascade,
  week_number integer not null,
  year integer not null,
  day text not null check (day in ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  current_recipe_id uuid references public.recipes (id),
  proposed_recipe_id uuid not null references public.recipes (id),
  suggested_by_user_id uuid not null references public.users (id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index recipe_swap_suggestions_family_status_idx
  on public.recipe_swap_suggestions (family_id, status);
create index recipe_swap_suggestions_slot_idx
  on public.recipe_swap_suggestions (meal_plan_owner_id, week_number, year, day);

alter table public.recipe_swap_suggestions enable row level security;

-- visible to any member of the family (this is the group's view of pending/recent swaps)
create policy recipe_swap_suggestions_select on public.recipe_swap_suggestions
  for select using (
    exists (
      select 1 from public.family_members fm
      where fm.family_id = recipe_swap_suggestions.family_id and fm.user_id = auth.uid()
    )
  );

-- any family member can suggest a swap, attributed to themselves
create policy recipe_swap_suggestions_insert on public.recipe_swap_suggestions
  for insert with check (
    suggested_by_user_id = auth.uid()
    and exists (
      select 1 from public.family_members fm
      where fm.family_id = recipe_swap_suggestions.family_id and fm.user_id = auth.uid()
    )
  );

-- only the family owner can change a suggestion's status directly (covers
-- "dismiss"; "approve" goes through approve_recipe_swap_suggestion below
-- since it must also write to the owner's meal plan)
create policy recipe_swap_suggestions_owner_update on public.recipe_swap_suggestions
  for update using (
    exists (
      select 1 from public.family_members fm
      where fm.family_id = recipe_swap_suggestions.family_id
        and fm.user_id = auth.uid() and fm.role = 'owner'
    )
  ) with check (
    exists (
      select 1 from public.family_members fm
      where fm.family_id = recipe_swap_suggestions.family_id
        and fm.user_id = auth.uid() and fm.role = 'owner'
    )
  );

-- Approves a pending suggestion: verifies the caller is the family's owner,
-- writes the proposed recipe onto the owner's plan for that day, marks the
-- suggestion approved, and dismisses any other pending suggestions for the
-- same slot (they're now stale — the day already changed).
create or replace function public.approve_recipe_swap_suggestion(p_suggestion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  is_owner boolean;
  col text;
begin
  select * into s from public.recipe_swap_suggestions where id = p_suggestion_id and status = 'pending';

  if not found then
    raise exception 'suggestion not found or already resolved';
  end if;

  select exists (
    select 1 from public.family_members fm
    where fm.family_id = s.family_id and fm.user_id = auth.uid() and fm.role = 'owner'
  ) into is_owner;

  if not is_owner then
    raise exception 'only the family owner can approve suggestions';
  end if;

  col := s.day || '_recipe_id';
  execute format(
    'update public.user_meal_plans set %I = $1 where user_id = $2 and week_number = $3 and year = $4',
    col
  ) using s.proposed_recipe_id, s.meal_plan_owner_id, s.week_number, s.year;

  update public.recipe_swap_suggestions
  set status = 'approved', updated_at = timezone('utc', now())
  where id = p_suggestion_id;

  update public.recipe_swap_suggestions
  set status = 'dismissed', updated_at = timezone('utc', now())
  where meal_plan_owner_id = s.meal_plan_owner_id
    and week_number = s.week_number
    and year = s.year
    and day = s.day
    and status = 'pending'
    and id <> p_suggestion_id;
end;
$$;

grant execute on function public.approve_recipe_swap_suggestion(uuid) to authenticated;
