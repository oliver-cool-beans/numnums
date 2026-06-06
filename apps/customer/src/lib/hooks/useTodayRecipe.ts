"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase-client";
export type StepAsset = { url: string; path?: string; caption?: string };

export type RecipeStep = {
  id: string;
  step_number: number;
  instructions: string;
  image_assets: StepAsset[];
  video_assets: StepAsset[];
};

export type RecipeIngredient = {
  handle: string;
  quantity: number | null;
  unit: string | null;
  image_url: string | null;
};

export type TodayRecipe = {
  id: string;
  name: string;
  image_url: string | null;
  total_minutes: number;
  prep_minutes: number;
  difficulty: string;
  headline: string | null;
  description: string | null;
  steps: RecipeStep[];
  ingredients: RecipeIngredient[];
  progress: {
    current_step_number: number;
    status: "not_started" | "in_progress" | "completed";
    started_at: string | null;
    completed_at: string | null;
  };
};

export function useTodayRecipe(userId: string | undefined, recipeId: string | undefined) {
  const [recipe, setRecipe] = useState<TodayRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId || !recipeId) {
      return;
    }

    const fetchRecipe = async () => {
      try {
        // Fetch recipe details
        const { data: recipeData, error: recipeError } = await supabase
          .from("recipes")
          .select("id, name, image_url, total_minutes, prep_minutes, difficulty, headline, description")
          .eq("id", recipeId)
          .single();

        if (recipeError) throw recipeError;

        // Fetch recipe steps
        const { data: stepsData, error: stepsError } = await supabase
          .from("recipe_steps")
          .select("id, step_number, instructions, image_assets, video_assets")
          .eq("recipe_id", recipeId)
          .order("step_number");

        if (stepsError) throw stepsError;

        // Fetch recipe ingredients via link table
        const { data: ingredientLinks, error: ingredientError } = await supabase
          .from("recipe_ingredient_links")
          .select("quantity, unit, ingredients(handle, image_url)")
          .eq("recipe_id", recipeId);

        if (ingredientError) throw ingredientError;

        // Fetch user's progress on this recipe
        const { data: progressData, error: progressError } = await supabase
          .from("user_recipe_progress")
          .select("current_step_number, status, started_at, completed_at")
          .eq("user_id", userId)
          .eq("recipe_id", recipeId)
          .maybeSingle();

        if (progressError && progressError.code !== "PGRST116") throw progressError;

        setRecipe({
          id: recipeData.id,
          name: recipeData.name,
          image_url: recipeData.image_url,
          total_minutes: recipeData.total_minutes,
          prep_minutes: recipeData.prep_minutes,
          difficulty: recipeData.difficulty,
          headline: recipeData.headline,
          description: recipeData.description,
          steps: stepsData || [],
          ingredients: (ingredientLinks ?? []).flatMap((link) => {
            const ing = link.ingredients as { handle: string; image_url: string | null } | null;
            if (!ing) return [];
            return [{ handle: ing.handle, quantity: link.quantity, unit: link.unit, image_url: ing.image_url }];
          }),
          progress: progressData || {
            current_step_number: 0,
            status: "not_started",
            started_at: null,
            completed_at: null,
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [userId, recipeId]);

  return { recipe, loading, error };
}
