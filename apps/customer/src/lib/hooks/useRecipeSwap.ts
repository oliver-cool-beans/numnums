"use client";

import { useCallback, useEffect, useState } from "react";
import { getWeekAtOffset } from "@/lib/utils";
import type { OnboardingRecipe, Weekday } from "@/lib/recipeSchedule";
import { fetchWeekRecipeIds } from "@/lib/mealPlanActions";
import { switchMealPlanRecipe } from "@/lib/familyMealPlanActions";

export type RecipeSwapTarget = {
  day: Weekday;
  week: number;
  year: number;
  currentRecipeId: string | null;
};

// Shared "open picker → persist swap → refresh" flow used by both the
// dashboard's quick long-press swap and the full-week view.
export function useRecipeSwap(userId: string | undefined, onSwapped: () => void) {
  const [target, setTarget] = useState<RecipeSwapTarget | null>(null);
  const [recentRecipeIds, setRecentRecipeIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback((next: RecipeSwapTarget) => {
    setError(null);
    setTarget(next);
  }, []);

  const close = useCallback(() => setTarget(null), []);

  useEffect(() => {
    if (!target || !userId) return;
    let isMounted = true;
    const lastWeek = getWeekAtOffset(-1);
    fetchWeekRecipeIds(userId, lastWeek.week, lastWeek.year)
      .then((ids) => {
        if (isMounted) setRecentRecipeIds(new Set(ids));
      })
      .catch((fetchError) => console.error("[recipe-swap] Failed to load recent recipes", fetchError));
    return () => { isMounted = false; };
  }, [target, userId]);

  const handleSelect = useCallback(
    async (recipe: OnboardingRecipe) => {
      if (!target || !userId) return;
      setPending(true);
      setError(null);
      try {
        await switchMealPlanRecipe(userId, target.week, target.year, target.day, recipe.id);
        setTarget(null);
        onSwapped();
      } catch (swapError) {
        setError(swapError instanceof Error ? swapError.message : "That swap didn't go through. Please try again.");
      } finally {
        setPending(false);
      }
    },
    [target, userId, onSwapped],
  );

  return { target, recentRecipeIds, pending, error, open, close, handleSelect };
}
