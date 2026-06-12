import { supabase } from "./supabase-client";
import { persistWeekPlan } from "./mealPlanActions";
import type { ReadyMeal, Weekday } from "./recipeSchedule";
import type { Recipe, MealPlanDay } from "./hooks/useUserMealPlan";

const DAY_ORDER: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const DAY_LABELS: Record<Weekday, string> = {
  monday: "MON",
  tuesday: "TUE",
  wednesday: "WED",
  thursday: "THU",
  friday: "FRI",
  saturday: "SAT",
  sunday: "SUN",
};

export type FamilyWeekPlan = {
  id: string;
  week_number: number;
  year: number;
  days: MealPlanDay[];
};

export type SwapSuggestion = {
  id: string;
  day: Weekday;
  status: "pending" | "approved" | "dismissed";
  currentRecipe: Pick<Recipe, "id" | "name"> | null;
  proposedRecipe: Pick<Recipe, "id" | "name" | "image_url">;
  suggestedByUserId: string;
  suggestedByName: string | null;
  yesVotes: number;
  noVotes: number;
};

function dayColumn(day: Weekday) {
  return `${day}_recipe_id` as const;
}

export async function fetchFamilyWeekPlan(
  ownerId: string,
  week: number,
  year: number,
): Promise<FamilyWeekPlan | null> {
  const { data, error: queryError } = await supabase
    .from("user_meal_plans")
    .select("*")
    .eq("user_id", ownerId)
    .eq("week_number", week)
    .eq("year", year)
    .maybeSingle();

  if (queryError && queryError.code !== "PGRST116") throw queryError;
  if (!data) return null;

  const recipeIds = DAY_ORDER.map((day) => data[dayColumn(day)]).filter(Boolean);

  const { data: recipes, error: recipesError } = await supabase
    .from("recipes")
    .select("id, name, image_url, total_minutes, prep_minutes, difficulty, headline")
    .in("id", recipeIds);

  if (recipesError) throw recipesError;

  const recipeMap = new Map((recipes ?? []).map((r) => [r.id, r]));

  const days: MealPlanDay[] = DAY_ORDER.map((day) => {
    const recipeId = data[dayColumn(day)];
    return { day, dayLabel: DAY_LABELS[day], recipe: recipeId ? recipeMap.get(recipeId) ?? null : null };
  });

  return { id: data.id, week_number: data.week_number, year: data.year, days };
}

export async function fetchFamilySwapSuggestions(
  familyId: string,
  week: number,
  year: number,
): Promise<SwapSuggestion[]> {
  const { data, error } = await supabase
    .from("recipe_swap_suggestions")
    .select(
      "id, day, status, suggested_by_user_id, yes_votes, no_votes, " +
        "current_recipe:recipes!recipe_swap_suggestions_current_recipe_id_fkey(id, name), " +
        "proposed_recipe:recipes!recipe_swap_suggestions_proposed_recipe_id_fkey(id, name, image_url), " +
        "suggested_by:users!recipe_swap_suggestions_suggested_by_user_id_fkey(name)",
    )
    .eq("family_id", familyId)
    .eq("week_number", week)
    .eq("year", year)
    .eq("status", "pending");

  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row as unknown as {
      id: string;
      day: Weekday;
      status: "pending" | "approved" | "dismissed";
      suggested_by_user_id: string;
      yes_votes: number;
      no_votes: number;
      current_recipe: { id: string; name: string } | null;
      proposed_recipe: { id: string; name: string; image_url: string | null };
      suggested_by: { name: string | null } | null;
    };
    return {
      id: r.id,
      day: r.day,
      status: r.status,
      currentRecipe: r.current_recipe,
      proposedRecipe: r.proposed_recipe,
      suggestedByUserId: r.suggested_by_user_id,
      suggestedByName: r.suggested_by?.name ?? null,
      yesVotes: r.yes_votes ?? 0,
      noVotes: r.no_votes ?? 0,
    };
  });
}

export async function suggestRecipeSwap(params: {
  familyId: string;
  ownerId: string;
  week: number;
  year: number;
  day: Weekday;
  currentRecipeId: string | null;
  proposedRecipeId: string;
  suggestedByUserId: string;
}): Promise<void> {
  const { error } = await supabase.from("recipe_swap_suggestions").insert({
    family_id: params.familyId,
    meal_plan_owner_id: params.ownerId,
    week_number: params.week,
    year: params.year,
    day: params.day,
    current_recipe_id: params.currentRecipeId,
    proposed_recipe_id: params.proposedRecipeId,
    suggested_by_user_id: params.suggestedByUserId,
  });

  if (error) throw error;
}

async function refreshShoppingListForWeek(ownerId: string, week: number, year: number): Promise<void> {
  const { data: planRow, error: planError } = await supabase
    .from("user_meal_plans")
    .select("*")
    .eq("user_id", ownerId)
    .eq("week_number", week)
    .eq("year", year)
    .maybeSingle();

  if (planError) throw planError;
  if (!planRow) return;

  const dayRecipeIds = DAY_ORDER.map((d) => [d, planRow[dayColumn(d)] as string | null] as const).filter(
    (entry): entry is [Weekday, string] => Boolean(entry[1]),
  );
  if (dayRecipeIds.length === 0) return;

  const { data: recipes, error: recipesError } = await supabase
    .from("recipes")
    .select(
      "id, name, image_url, total_minutes, prep_minutes, difficulty, headline, description, source, servings, updated_at, dietary_tags",
    )
    .in(
      "id",
      dayRecipeIds.map(([, id]) => id),
    );

  if (recipesError) throw recipesError;

  const recipeMap = new Map((recipes ?? []).map((r) => [r.id, r]));
  const meals: ReadyMeal[] = dayRecipeIds
    .map(([d, id]) => ({ day: d, recipe: recipeMap.get(id) }))
    .filter((m): m is ReadyMeal => Boolean(m.recipe));

  await persistWeekPlan(ownerId, meals, week, year);
}

export async function approveRecipeSwapSuggestion(
  suggestionId: string,
  ownerId: string,
  week: number,
  year: number,
): Promise<void> {
  const { error } = await supabase.rpc("approve_recipe_swap_suggestion", {
    p_suggestion_id: suggestionId,
  });
  if (error) throw error;

  await refreshShoppingListForWeek(ownerId, week, year);
}

export async function voteOnRecipeSwapSuggestion(suggestionId: string, yes: boolean): Promise<void> {
  const { error } = await supabase.rpc("vote_recipe_swap_suggestion", {
    p_suggestion_id: suggestionId,
    p_yes: yes,
  });
  if (error) throw error;
}

export async function dismissRecipeSwapSuggestion(suggestionId: string): Promise<void> {
  const { error } = await supabase
    .from("recipe_swap_suggestions")
    .update({ status: "dismissed" })
    .eq("id", suggestionId);

  if (error) throw error;
}

// Owner-only direct swap: replaces a single day's recipe on the owner's plan
// with no suggestion/approval step, then re-persists the week so the shopping
// list stays in sync (same regeneration path a full re-plan uses).
export async function switchMealPlanRecipe(
  ownerId: string,
  week: number,
  year: number,
  day: Weekday,
  recipeId: string,
): Promise<void> {
  const { error } = await supabase
    .from("user_meal_plans")
    .update({ [dayColumn(day)]: recipeId })
    .eq("user_id", ownerId)
    .eq("week_number", week)
    .eq("year", year);

  if (error) throw error;

  await refreshShoppingListForWeek(ownerId, week, year);
}
