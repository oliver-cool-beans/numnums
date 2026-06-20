"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase-client";

export type ActivityItem = {
  id: number;
  type: "cooked" | "planned" | "family_cooked";
  userId: string;
  userName: string | null;
  familyId: string | null;
  familyName: string | null;
  recipeId: string | null;
  recipeName: string | null;
  recipeImageUrl: string | null;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
};

export function useActivityFeed(currentUserId: string | undefined) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);

    // RLS filters visibility; we fetch all readable rows sorted by recency.
    const { data: rows, error } = await supabase
      .from("activity")
      .select(`
        id,
        type,
        payload,
        created_at,
        user_id,
        actor_display_name,
        activity_likes ( user_id )
      `)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("[activity-feed] fetch failed", error);
      setItems([]);
      setLoading(false);
      return;
    }

    // Collect unique recipe IDs and family IDs to batch-fetch.
    const recipeIds = new Set<string>();
    const familyIds = new Set<string>();

    for (const row of rows ?? []) {
      const p = row.payload as Record<string, string> | null;
      if (p?.recipe_id) recipeIds.add(p.recipe_id);
      if (p?.family_id) familyIds.add(p.family_id);
    }

    const [recipesResult, familiesResult] = await Promise.all([
      recipeIds.size > 0
        ? supabase.from("recipes").select("id, name, image_url").in("id", Array.from(recipeIds))
        : Promise.resolve({ data: [] as { id: string; name: string; image_url: string | null }[], error: null }),
      familyIds.size > 0
        ? supabase.from("families").select("id, name").in("id", Array.from(familyIds))
        : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
    ]);

    const recipeMap = new Map((recipesResult.data ?? []).map((r) => [r.id, r]));
    const familyMap = new Map((familiesResult.data ?? []).map((f) => [f.id, f]));

    type RawRow = {
      id: number;
      type: string;
      payload: Record<string, string> | null;
      created_at: string;
      user_id: string;
      actor_display_name: string | null;
      activity_likes: { user_id: string }[];
    };

    const mapped: ActivityItem[] = (rows as RawRow[] ?? []).map((row) => {
      const p = row.payload ?? {};
      const recipe = p.recipe_id ? recipeMap.get(p.recipe_id) : null;
      const family = p.family_id ? familyMap.get(p.family_id) : null;
      const likes = row.activity_likes ?? [];

      return {
        id: row.id,
        type: row.type as ActivityItem["type"],
        userId: row.user_id,
        userName: row.actor_display_name ?? null,
        familyId: p.family_id ?? null,
        familyName: family?.name ?? null,
        recipeId: p.recipe_id ?? null,
        recipeName: recipe?.name ?? null,
        recipeImageUrl: recipe?.image_url ?? null,
        likeCount: likes.length,
        likedByMe: likes.some((l) => l.user_id === currentUserId),
        createdAt: row.created_at,
      };
    });

    setItems(mapped);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleLike = useCallback(
    async (activityId: number, currentlyLiked: boolean) => {
      if (!currentUserId) return;

      // Optimistic update
      setItems((prev) =>
        prev.map((item) =>
          item.id === activityId
            ? {
                ...item,
                likedByMe: !currentlyLiked,
                likeCount: item.likeCount + (currentlyLiked ? -1 : 1),
              }
            : item,
        ),
      );

      if (currentlyLiked) {
        await supabase.from("activity_likes").delete().eq("activity_id", activityId).eq("user_id", currentUserId);
      } else {
        await supabase.from("activity_likes").insert({ activity_id: activityId, user_id: currentUserId });
      }
    },
    [currentUserId],
  );

  return { items, loading, toggleLike };
}
