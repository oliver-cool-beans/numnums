import { supabase } from "./supabase-client";

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type OnboardingRecipe = {
  id: string;
  name: string;
  image_url: string | null;
  total_minutes: number | null;
  prep_minutes: number | null;
  difficulty: number | string | null;
  headline: string | null;
  description: string | null;
  source: string | null;
  servings: number | null;
  updated_at: string | null;
  dietary_tags: string[];
};

export type ReadyMeal = {
  day: Weekday;
  recipe: OnboardingRecipe;
};

export function formatDifficulty(difficulty: OnboardingRecipe["difficulty"]) {
  if (typeof difficulty === "string" && difficulty.length > 0) {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  }
  if (typeof difficulty === "number") {
    if (difficulty <= 2) return "Easy";
    if (difficulty <= 4) return "Medium";
    return "Big cook";
  }
  return "Easy";
}

function getRecipeSearchText(recipe: OnboardingRecipe) {
  return [recipe.name, recipe.headline, recipe.description, recipe.source]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function matchesRequirement(recipe: OnboardingRecipe, requirementId: string) {
  switch (requirementId) {
    case "vegetarian":
    case "vegan":
    case "gluten-free":
    case "dairy-free":
      return recipe.dietary_tags.includes(requirementId);
    case "high-protein": {
      const text = getRecipeSearchText(recipe);
      return ["chicken", "turkey", "beef", "pork", "salmon", "steak", "tofu", "protein"].some(
        (kw) => text.includes(kw),
      );
    }
    case "quick":
      return typeof recipe.total_minutes === "number" && recipe.total_minutes <= 25;
    default:
      return false;
  }
}

export function buildRecipeBadges(recipe: OnboardingRecipe) {
  const badges: string[] = [];
  if (matchesRequirement(recipe, "high-protein")) badges.push("High protein");
  if (matchesRequirement(recipe, "vegetarian")) badges.push("Vegetarian");
  if (matchesRequirement(recipe, "vegan")) badges.push("Vegan");
  if (matchesRequirement(recipe, "quick")) badges.push("Quick");
  return Array.from(new Set(badges)).slice(0, 3);
}

function scoreRecipeSimilarity(
  candidate: OnboardingRecipe,
  anchors: OnboardingRecipe[],
  selectedRequirements: string[],
  recentRecipeIds?: Set<string>,
) {
  let score = 0;
  const candidateBadges = buildRecipeBadges(candidate);
  for (const anchor of anchors) {
    if (anchor.source && candidate.source && anchor.source === candidate.source) score += 1;
    const anchorBadges = buildRecipeBadges(anchor);
    score += candidateBadges.filter((b) => anchorBadges.includes(b)).length;
    if (
      typeof anchor.total_minutes === "number" &&
      typeof candidate.total_minutes === "number" &&
      Math.abs(anchor.total_minutes - candidate.total_minutes) <= 10
    )
      score += 1;
  }
  score +=
    selectedRequirements.filter((r) => matchesRequirement(candidate, r)).length * 2;
  if (recentRecipeIds?.has(candidate.id)) score -= 5;
  return score;
}

export function getFilteredRecipes(recipes: OnboardingRecipe[], selectedRequirements: string[]) {
  if (selectedRequirements.length === 0) return recipes;
  const matches = recipes.filter((r) =>
    selectedRequirements.every((req) => matchesRequirement(r, req)),
  );
  return matches.length > 0 ? matches : recipes;
}

export function chunkRecipes(recipes: OnboardingRecipe[]) {
  const pages: OnboardingRecipe[][] = [];
  for (let i = 0; i < recipes.length; i += 6) pages.push(recipes.slice(i, i + 6));
  return pages;
}

export function buildSchedule(
  selectedRecipes: OnboardingRecipe[],
  allRecipes: OnboardingRecipe[],
  plannedDays: Weekday[],
  selectedRequirements: string[],
  recentRecipeIds?: Set<string>,
): ReadyMeal[] {
  const selectedIds = new Set(selectedRecipes.map((r) => r.id));
  const meals: ReadyMeal[] = [];
  // Shuffle first so equal-scored recipes vary between generations
  const shuffled = [...allRecipes].sort(() => Math.random() - 0.5);
  const scoredPool = shuffled
    .filter((r) => !selectedIds.has(r.id))
    .sort(
      (a, b) =>
        scoreRecipeSimilarity(b, selectedRecipes, selectedRequirements, recentRecipeIds) -
        scoreRecipeSimilarity(a, selectedRecipes, selectedRequirements, recentRecipeIds),
    );

  for (let i = 0; i < plannedDays.length; i++) {
    const day = plannedDays[i];
    const recipe =
      selectedRecipes[i] ??
      scoredPool.shift() ??
      selectedRecipes[i % selectedRecipes.length];
    if (!recipe) throw new Error("We couldn't find enough recipes to build this week yet.");
    meals.push({ day, recipe });
  }
  return meals;
}

const RECIPE_SELECT =
  "id, name, image_url, total_minutes, prep_minutes, difficulty, headline, description, source, servings, updated_at, dietary_tags";

export async function fetchOnboardingRecipes(): Promise<OnboardingRecipe[]> {
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function searchRecipesByName(query: string): Promise<OnboardingRecipe[]> {
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .ilike("name", `%${query}%`)
    .order("name", { ascending: true })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}
