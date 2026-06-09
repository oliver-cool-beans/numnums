"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { getCurrentWeek, getDayOfWeek } from "@/lib/utils";

export type FriendTodayRecipe = {
  id: string;
  name: string;
  image_url: string | null;
  total_minutes: number;
  difficulty: string;
};

export type FriendToday = {
  friend: { id: string; name: string | null };
  recipe: FriendTodayRecipe | null;
};

const TODAY_RECIPE_COLUMNS = [
  "monday_recipe_id",
  "tuesday_recipe_id",
  "wednesday_recipe_id",
  "thursday_recipe_id",
  "friday_recipe_id",
  "saturday_recipe_id",
  "sunday_recipe_id",
] as const;

type Person = { id: string; name: string | null };

function single(value: Person | Person[] | null): Person | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * What each of the user's friends has on for dinner tonight — drives the
 * "friends" activity block on the dashboard. Relies on the friends-can-view
 * each other's `user_meal_plans` RLS policy.
 */
export function useFriendsToday(userId: string | undefined) {
  const [friendsToday, setFriendsToday] = useState<FriendToday[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      try {
        const { data: friendRows, error: friendError } = await supabase
          .from("friendships")
          .select(
            "requester_id, addressee_id, requester:users!friendships_requester_id_fkey(id, name), addressee:users!friendships_addressee_id_fkey(id, name)"
          )
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

        if (friendError) throw friendError;

        type Row = {
          requester_id: string;
          addressee_id: string;
          requester: Person | Person[] | null;
          addressee: Person | Person[] | null;
        };

        const friends = ((friendRows ?? []) as Row[])
          .map((row) => (row.requester_id === userId ? single(row.addressee) : single(row.requester)))
          .filter((friend): friend is Person => Boolean(friend));

        if (friends.length === 0) {
          setFriendsToday([]);
          return;
        }

        const { week, year } = getCurrentWeek();
        const dayOfWeek = getDayOfWeek();
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const todayColumn = TODAY_RECIPE_COLUMNS[dayIndex];

        const { data: plans, error: planError } = await supabase
          .from("user_meal_plans")
          .select(`user_id, ${todayColumn}`)
          .eq("week_number", week)
          .eq("year", year)
          .in("user_id", friends.map((friend) => friend.id));

        if (planError) throw planError;

        const recipeIdByFriendId = new Map<string, string | null>(
          ((plans ?? []) as Record<string, string | null>[]).map((plan) => [
            plan.user_id as unknown as string,
            plan[todayColumn],
          ])
        );

        const recipeIds = [...recipeIdByFriendId.values()].filter((id): id is string => Boolean(id));

        const { data: recipes, error: recipeError } = recipeIds.length
          ? await supabase
              .from("recipes")
              .select("id, name, image_url, total_minutes, difficulty")
              .in("id", recipeIds)
          : { data: [] as FriendTodayRecipe[], error: null };

        if (recipeError) throw recipeError;

        const recipeById = new Map((recipes ?? []).map((recipe) => [recipe.id, recipe as FriendTodayRecipe]));

        setFriendsToday(
          friends.map((friend) => {
            const recipeId = recipeIdByFriendId.get(friend.id) ?? null;
            return { friend, recipe: recipeId ? recipeById.get(recipeId) ?? null : null };
          })
        );
      } catch (err) {
        console.error("[useFriendsToday] Failed to load friends' meals", err);
        setFriendsToday([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  return { friendsToday, loading };
}
