"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { getCurrentWeek } from "@/lib/utils";

export type Recipe = {
  id: string;
  name: string;
  image_url: string | null;
  total_minutes: number;
  prep_minutes: number;
  difficulty: string;
  headline: string | null;
};

export type MealPlanDay = {
  day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  dayLabel: string;
  recipe: Recipe | null;
};

export type UserMealPlan = {
  id: string;
  week_number: number;
  year: number;
  days: MealPlanDay[];
};

export function useUserMealPlan(userId: string | undefined, week?: number, year?: number) {
  const [mealPlan, setMealPlan] = useState<UserMealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMealPlan = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      const currentWeek = getCurrentWeek();
      const targetWeek = week ?? currentWeek.week;
      const targetYear = year ?? currentWeek.year;

      const { data, error: queryError } = await supabase
        .from("user_meal_plans")
        .select("*")
        .eq("user_id", userId)
        .eq("week_number", targetWeek)
        .eq("year", targetYear)
        .maybeSingle();

      if (queryError && queryError.code !== "PGRST116") throw queryError;
      if (!data) {
        setMealPlan(null);
        return;
      }

      // Fetch all recipe data for the week
      const recipeIds = [
        data.monday_recipe_id,
        data.tuesday_recipe_id,
        data.wednesday_recipe_id,
        data.thursday_recipe_id,
        data.friday_recipe_id,
        data.saturday_recipe_id,
        data.sunday_recipe_id,
      ].filter(Boolean);

      const { data: recipes, error: recipesError } = await supabase
        .from("recipes")
        .select("id, name, image_url, total_minutes, prep_minutes, difficulty, headline")
        .in("id", recipeIds);

      if (recipesError) throw recipesError;

      const recipeMap = new Map(recipes?.map((r) => [r.id, r]) || []);

      const days: MealPlanDay[] = [
        { day: "monday", dayLabel: "MON", recipe: recipeMap.get(data.monday_recipe_id) || null },
        { day: "tuesday", dayLabel: "TUE", recipe: recipeMap.get(data.tuesday_recipe_id) || null },
        {
          day: "wednesday",
          dayLabel: "WED",
          recipe: recipeMap.get(data.wednesday_recipe_id) || null,
        },
        { day: "thursday", dayLabel: "THU", recipe: recipeMap.get(data.thursday_recipe_id) || null },
        { day: "friday", dayLabel: "FRI", recipe: recipeMap.get(data.friday_recipe_id) || null },
        {
          day: "saturday",
          dayLabel: "SAT",
          recipe: data.saturday_recipe_id ? recipeMap.get(data.saturday_recipe_id) || null : null,
        },
        { day: "sunday", dayLabel: "SUN", recipe: data.sunday_recipe_id ? recipeMap.get(data.sunday_recipe_id) || null : null },
      ];

      setMealPlan({
        id: data.id,
        week_number: data.week_number,
        year: data.year,
        days,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [userId, week, year]);

  useEffect(() => {
    void fetchMealPlan();
  }, [fetchMealPlan]);

  return { mealPlan, loading, error, refetch: fetchMealPlan };
}
