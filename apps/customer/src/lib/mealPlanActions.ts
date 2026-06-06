import { supabase } from "./supabase-client";
import type { ReadyMeal } from "./recipeSchedule";

type IngredientLinkRow = {
  ingredient_id: string;
  quantity: number | string | null;
};

type ProductLinkRow = {
  ingredient_id: string;
  product_id: string;
};

export async function saveMealPlan(
  userId: string,
  meals: ReadyMeal[],
  weekNumber: number,
  yearNumber: number,
): Promise<string> {
  const byDay = new Map(meals.map((m) => [m.day, m.recipe]));

  const { data, error } = await supabase
    .from("user_meal_plans")
    .upsert(
      {
        user_id: userId,
        week_number: weekNumber,
        year: yearNumber,
        monday_recipe_id: byDay.get("monday")?.id,
        tuesday_recipe_id: byDay.get("tuesday")?.id,
        wednesday_recipe_id: byDay.get("wednesday")?.id,
        thursday_recipe_id: byDay.get("thursday")?.id,
        friday_recipe_id: byDay.get("friday")?.id,
        saturday_recipe_id: byDay.get("saturday")?.id ?? null,
        sunday_recipe_id: byDay.get("sunday")?.id ?? null,
      },
      { onConflict: "user_id,week_number,year" },
    )
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function replaceShoppingList(userId: string, mealPlanId: string): Promise<string> {
  const { error: deleteError } = await supabase
    .from("shopping_lists")
    .delete()
    .eq("meal_plan_id", mealPlanId)
    .eq("user_id", userId);

  if (deleteError) throw deleteError;

  const { data, error } = await supabase
    .from("shopping_lists")
    .insert({ meal_plan_id: mealPlanId, user_id: userId })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function loadIngredientTotals(recipeIds: string[]): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("recipe_ingredient_links")
    .select("ingredient_id, quantity")
    .in("recipe_id", recipeIds);

  if (error) throw error;

  const totals = new Map<string, number>();
  for (const link of (data ?? []) as IngredientLinkRow[]) {
    totals.set(link.ingredient_id, (totals.get(link.ingredient_id) ?? 0) + Number(link.quantity ?? 1));
  }
  return totals;
}

async function loadPreferredProducts(ingredientIds: string[]): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("ingredient_product_links")
    .select("ingredient_id, product_id")
    .in("ingredient_id", ingredientIds)
    .order("priority", { ascending: false });

  if (error) throw error;

  const preferred = new Map<string, string>();
  for (const link of (data ?? []) as ProductLinkRow[]) {
    if (!preferred.has(link.ingredient_id)) preferred.set(link.ingredient_id, link.product_id);
  }
  return preferred;
}

async function insertShoppingListItems(
  shoppingListId: string,
  ingredientTotals: Map<string, number>,
): Promise<void> {
  if (ingredientTotals.size === 0) return;

  const ids = Array.from(ingredientTotals.keys());
  const preferred = await loadPreferredProducts(ids);

  const items = ids.map((id) => ({
    shopping_list_id: shoppingListId,
    ingredient_id: id,
    product_id: preferred.get(id) ?? null,
    quantity_needed: ingredientTotals.get(id) ?? 1,
  }));

  const { error } = await supabase.from("shopping_list_items").insert(items);
  if (error) throw error;
}

export async function persistWeekPlan(
  userId: string,
  meals: ReadyMeal[],
  weekNumber: number,
  yearNumber: number,
): Promise<void> {
  const mealPlanId = await saveMealPlan(userId, meals, weekNumber, yearNumber);
  const shoppingListId = await replaceShoppingList(userId, mealPlanId);
  const recipeIds = Array.from(new Set(meals.map((m) => m.recipe.id)));
  const ingredientTotals = await loadIngredientTotals(recipeIds);
  await insertShoppingListItems(shoppingListId, ingredientTotals);
}

export async function fetchWeekRecipeIds(
  userId: string,
  weekNumber: number,
  yearNumber: number,
): Promise<string[]> {
  const { data } = await supabase
    .from("user_meal_plans")
    .select(
      "monday_recipe_id, tuesday_recipe_id, wednesday_recipe_id, thursday_recipe_id, friday_recipe_id, saturday_recipe_id, sunday_recipe_id",
    )
    .eq("user_id", userId)
    .eq("week_number", weekNumber)
    .eq("year", yearNumber)
    .maybeSingle();

  if (!data) return [];
  return [
    data.monday_recipe_id,
    data.tuesday_recipe_id,
    data.wednesday_recipe_id,
    data.thursday_recipe_id,
    data.friday_recipe_id,
    data.saturday_recipe_id,
    data.sunday_recipe_id,
  ].filter(Boolean) as string[];
}
