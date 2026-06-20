import { supabase } from "./supabase-client";
import {
  buildSchedule,
  fetchOnboardingRecipes,
  getFilteredRecipes,
  type ReadyMeal,
  type Weekday,
} from "./recipeSchedule";
import { fetchDietaryPreferences } from "./dietaryPreferences";
import { dateToIsoWeek, getWeekMondayDate } from "./utils";

const DEFAULT_PLAN_DAYS: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

export async function generateWeekPlan(
  userId: string,
  week: number,
  year: number,
  excludeIds?: Set<string>,
): Promise<ReadyMeal[]> {
  let effectiveExclude = excludeIds;

  if (!effectiveExclude) {
    const targetMonday = getWeekMondayDate(week, year);
    const prevMonday = new Date(targetMonday);
    prevMonday.setDate(targetMonday.getDate() - 7);
    const prevWeek = dateToIsoWeek(prevMonday);
    const prevWeekIds = await fetchWeekRecipeIds(userId, prevWeek.week, prevWeek.year);
    effectiveExclude = new Set(prevWeekIds);
  }

  const [allRecipes, preferences] = await Promise.all([
    fetchOnboardingRecipes(),
    fetchDietaryPreferences(userId),
  ]);

  const pool = allRecipes.filter((r) => !effectiveExclude!.has(r.id));
  const effectivePool = pool.length >= DEFAULT_PLAN_DAYS.length ? pool : allRecipes;
  const filteredPool = getFilteredRecipes(effectivePool, preferences);
  const meals = buildSchedule([], filteredPool, DEFAULT_PLAN_DAYS, preferences);
  await persistWeekPlan(userId, meals, week, year);

  // Remove any pending swap suggestions for this week — they're stale after a full regen.
  await supabase
    .from("recipe_swap_suggestions")
    .delete()
    .eq("meal_plan_owner_id", userId)
    .eq("week_number", week)
    .eq("year", year)
    .eq("status", "pending");

  const { data: profile } = await supabase.from("users").select("name").eq("id", userId).single();
  void supabase.from("activity").insert({ user_id: userId, type: "planned", actor_display_name: profile?.name?.split(" ")[0] ?? null, payload: { week_number: week, year } });

  return meals;
}

export async function swapWeekDays(
  userId: string,
  week: number,
  year: number,
  dayA: Weekday,
  dayB: Weekday,
): Promise<void> {
  const colA = `${dayA}_recipe_id`;
  const colB = `${dayB}_recipe_id`;

  const { data: plan, error: fetchErr } = await supabase
    .from("user_meal_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("week_number", week)
    .eq("year", year)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!plan) throw new Error("No meal plan found");

  const row = plan as Record<string, string | null>;
  const recipeA = row[colA] ?? null;
  const recipeB = row[colB] ?? null;

  const { error: updateErr } = await supabase
    .from("user_meal_plans")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ [colA]: recipeB, [colB]: recipeA } as any)
    .eq("user_id", userId)
    .eq("week_number", week)
    .eq("year", year);

  if (updateErr) throw updateErr;
}

type IngredientLinkRow = {
  ingredient_id: string;
  quantity: number | string | null;
  unit: string | null;
};

type IngredientTotal = {
  total: number;
  unit: string | null;
};

type ProductLinkRow = {
  ingredient_id: string;
  product_id: string;
  // Supabase may return embedded FK resources as an array even for many-to-one joins
  products: { selling_size: number | null; selling_unit: string | null }[] | { selling_size: number | null; selling_unit: string | null } | null;
};

type ProductDetail = {
  product_id: string;
  selling_size: number | null;
  selling_unit: string | null;
};

function normalizeToBase(quantity: number, unit: string | null): { value: number; base: "g" | "ml" } | null {
  switch (unit) {
    case "g": return { value: quantity, base: "g" };
    case "kg": return { value: quantity * 1000, base: "g" };
    case "mg": return { value: quantity / 1000, base: "g" };
    case "ml": return { value: quantity, base: "ml" };
    case "l": return { value: quantity * 1000, base: "ml" };
    default: return null;
  }
}

function packsNeeded(
  ingredientQty: number,
  ingredientUnit: string | null,
  sellingSize: number | null,
  sellingUnit: string | null,
): number {
  if (!sellingSize) return 1;
  const iNorm = normalizeToBase(ingredientQty, ingredientUnit);
  const pNorm = normalizeToBase(sellingSize, sellingUnit);
  if (!iNorm || !pNorm || iNorm.base !== pNorm.base) return 1;
  return Math.ceil(iNorm.value / pNorm.value);
}

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
        monday_recipe_id: byDay.get("monday")?.id ?? null,
        tuesday_recipe_id: byDay.get("tuesday")?.id ?? null,
        wednesday_recipe_id: byDay.get("wednesday")?.id ?? null,
        thursday_recipe_id: byDay.get("thursday")?.id ?? null,
        friday_recipe_id: byDay.get("friday")?.id ?? null,
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

async function loadIngredientTotals(recipeIds: string[]): Promise<Map<string, IngredientTotal>> {
  const { data, error } = await supabase
    .from("recipe_ingredient_links")
    .select("ingredient_id, quantity, unit")
    .in("recipe_id", recipeIds);

  if (error) throw error;

  const totals = new Map<string, IngredientTotal>();
  for (const link of (data ?? []) as IngredientLinkRow[]) {
    const qty = Number(link.quantity ?? 1);
    const existing = totals.get(link.ingredient_id);
    if (existing) {
      existing.total += qty;
    } else {
      totals.set(link.ingredient_id, { total: qty, unit: link.unit });
    }
  }
  return totals;
}

async function loadPreferredProducts(ingredientIds: string[]): Promise<Map<string, ProductDetail>> {
  const { data, error } = await supabase
    .from("ingredient_product_links")
    .select("ingredient_id, product_id, products(selling_size, selling_unit)")
    .in("ingredient_id", ingredientIds)
    .order("priority", { ascending: false });

  if (error) throw error;

  const preferred = new Map<string, ProductDetail>();
  for (const link of (data ?? []) as unknown as ProductLinkRow[]) {
    if (!preferred.has(link.ingredient_id)) {
      const prod = Array.isArray(link.products) ? link.products[0] : link.products;
      preferred.set(link.ingredient_id, {
        product_id: link.product_id,
        selling_size: prod?.selling_size ?? null,
        selling_unit: prod?.selling_unit ?? null,
      });
    }
  }
  return preferred;
}

async function insertShoppingListItems(
  shoppingListId: string,
  ingredientTotals: Map<string, IngredientTotal>,
): Promise<void> {
  if (ingredientTotals.size === 0) return;

  const ids = Array.from(ingredientTotals.keys());
  const preferred = await loadPreferredProducts(ids);

  const items = ids.map((id) => {
    const { total, unit } = ingredientTotals.get(id)!;
    const product = preferred.get(id);
    const quantityNeeded = product
      ? packsNeeded(total, unit, product.selling_size, product.selling_unit)
      : total;
    return {
      shopping_list_id: shoppingListId,
      ingredient_id: id,
      product_id: product?.product_id ?? null,
      quantity_needed: quantityNeeded,
    };
  });

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
