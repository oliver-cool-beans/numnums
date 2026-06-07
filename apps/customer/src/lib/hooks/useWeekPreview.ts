"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { getCurrentWeek } from "@/lib/utils";

export type WeekPreviewDay = {
  day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  dayLabel: string;
  recipeId: string | null;
  recipeName: string | null;
  recipeImage: string | null;
  difficulty: number | string | null;
  isToday: boolean;
};

export function useWeekPreview(userId: string | undefined) {
  const [week, setWeek] = useState<WeekPreviewDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const fetchWeekPreview = async () => {
      try {
        const { week: currentWeek, year: currentYear } = getCurrentWeek();
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc

        const { data, error: queryError } = await supabase
          .from("user_meal_plans")
          .select("monday_recipe_id, tuesday_recipe_id, wednesday_recipe_id, thursday_recipe_id, friday_recipe_id, saturday_recipe_id, sunday_recipe_id")
          .eq("user_id", userId)
          .eq("week_number", currentWeek)
          .eq("year", currentYear)
          .maybeSingle();

        if (queryError && queryError.code !== "PGRST116") throw queryError;
        if (!data) {
          setWeek([]);
          return;
        }

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
          .select("id, name, image_url, difficulty")
          .in("id", recipeIds);

        if (recipesError) throw recipesError;

        const recipeMap = new Map(recipes?.map((r) => [r.id, r]) || []);

          const days: WeekPreviewDay[] = [
          {
            day: "monday",
            dayLabel: "MON",
            recipeId: data.monday_recipe_id || null,
            recipeName: recipeMap.get(data.monday_recipe_id)?.name || "—",
            recipeImage: recipeMap.get(data.monday_recipe_id)?.image_url || null,
            difficulty: recipeMap.get(data.monday_recipe_id)?.difficulty || null,
            isToday: dayOfWeek === 1,
          },
          {
            day: "tuesday",
            dayLabel: "TUE",
            recipeId: data.tuesday_recipe_id || null,
            recipeName: recipeMap.get(data.tuesday_recipe_id)?.name || "—",
            recipeImage: recipeMap.get(data.tuesday_recipe_id)?.image_url || null,
            difficulty: recipeMap.get(data.tuesday_recipe_id)?.difficulty || null,
            isToday: dayOfWeek === 2,
          },
          {
            day: "wednesday",
            dayLabel: "WED",
            recipeId: data.wednesday_recipe_id || null,
            recipeName: recipeMap.get(data.wednesday_recipe_id)?.name || "—",
            recipeImage: recipeMap.get(data.wednesday_recipe_id)?.image_url || null,
            difficulty: recipeMap.get(data.wednesday_recipe_id)?.difficulty || null,
            isToday: dayOfWeek === 3,
          },
          {
            day: "thursday",
            dayLabel: "THU",
            recipeId: data.thursday_recipe_id || null,
            recipeName: recipeMap.get(data.thursday_recipe_id)?.name || "—",
            recipeImage: recipeMap.get(data.thursday_recipe_id)?.image_url || null,
            difficulty: recipeMap.get(data.thursday_recipe_id)?.difficulty || null,
            isToday: dayOfWeek === 4,
          },
          {
            day: "friday",
            dayLabel: "FRI",
            recipeId: data.friday_recipe_id || null,
            recipeName: recipeMap.get(data.friday_recipe_id)?.name || "—",
            recipeImage: recipeMap.get(data.friday_recipe_id)?.image_url || null,
            difficulty: recipeMap.get(data.friday_recipe_id)?.difficulty || null,
            isToday: dayOfWeek === 5,
          },
          {
            day: "saturday",
            dayLabel: "SAT",
            recipeId: data.saturday_recipe_id || null,
            recipeName: data.saturday_recipe_id ? recipeMap.get(data.saturday_recipe_id)?.name || "—" : null,
            recipeImage: data.saturday_recipe_id ? recipeMap.get(data.saturday_recipe_id)?.image_url || null : null,
            difficulty: data.saturday_recipe_id ? recipeMap.get(data.saturday_recipe_id)?.difficulty || null : null,
            isToday: dayOfWeek === 6,
          },
          {
            day: "sunday",
            dayLabel: "SUN",
            recipeId: data.sunday_recipe_id || null,
            recipeName: data.sunday_recipe_id ? recipeMap.get(data.sunday_recipe_id)?.name || "—" : null,
            recipeImage: data.sunday_recipe_id ? recipeMap.get(data.sunday_recipe_id)?.image_url || null : null,
            difficulty: data.sunday_recipe_id ? recipeMap.get(data.sunday_recipe_id)?.difficulty || null : null,
            isToday: dayOfWeek === 0,
          },
          ];

        setWeek(days);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchWeekPreview();
  }, [userId]);

  return { week, loading, error };
}
