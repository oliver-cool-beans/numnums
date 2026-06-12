-- Add yes/no vote tallies to swap suggestions so any family member can
-- signal preference without a separate table.

alter table public.recipe_swap_suggestions
  add column yes_votes integer not null default 0,
  add column no_votes integer not null default 0;

-- Any family member except the suggester can cast a vote.
create or replace function public.vote_recipe_swap_suggestion(p_suggestion_id uuid, p_yes boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  is_member boolean;
begin
  select * into s from public.recipe_swap_suggestions where id = p_suggestion_id and status = 'pending';
  if not found then
    raise exception 'suggestion not found or already resolved';
  end if;

  if s.suggested_by_user_id = auth.uid() then
    raise exception 'you cannot vote on your own suggestion';
  end if;

  select exists (
    select 1 from public.family_members fm
    where fm.family_id = s.family_id and fm.user_id = auth.uid()
  ) into is_member;

  if not is_member then
    raise exception 'only family members can vote';
  end if;

  if p_yes then
    update public.recipe_swap_suggestions
    set yes_votes = yes_votes + 1, updated_at = timezone('utc', now())
    where id = p_suggestion_id;
  else
    update public.recipe_swap_suggestions
    set no_votes = no_votes + 1, updated_at = timezone('utc', now())
    where id = p_suggestion_id;
  end if;
end;
$$;

grant execute on function public.vote_recipe_swap_suggestion(uuid, boolean) to authenticated;

-- Recreate approve function with self-approval prevention.
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

  if s.suggested_by_user_id = auth.uid() then
    raise exception 'you cannot approve your own suggestion';
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
