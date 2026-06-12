-- Allows a non-owner family member to remove themselves from a family.
-- Uses SECURITY DEFINER (bypasses RLS) because members don't have a direct
-- DELETE policy on family_members — only owners do.
create or replace function public.leave_family(p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'must be authenticated to leave a family';
  end if;

  if public.is_family_owner(p_family_id, caller) then
    raise exception 'the family owner cannot leave the family';
  end if;

  delete from public.family_members
  where family_id = p_family_id and user_id = caller;

  if not found then
    raise exception 'you are not a member of this family';
  end if;
end;
$$;

grant execute on function public.leave_family(uuid) to authenticated;
