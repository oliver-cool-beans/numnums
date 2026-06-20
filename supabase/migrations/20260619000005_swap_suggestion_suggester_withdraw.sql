-- Allow the suggester to withdraw (delete) their own pending suggestion.
create policy recipe_swap_suggestions_suggester_delete on public.recipe_swap_suggestions
  for delete using (
    suggested_by_user_id = auth.uid()
    and status = 'pending'
  );
