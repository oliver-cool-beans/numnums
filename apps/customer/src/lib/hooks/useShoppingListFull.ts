"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase-client";

export type EnrichedItem = {
  id: string;
  ingredient_id: string;
  product_id: string | null;
  quantity_needed: number;
  is_checked: boolean;
  ingredient_handle: string;
  is_pantry: boolean;
  product_name: string | null;
  product_category: string | null;
};

export type FullShoppingList = {
  id: string;
  status: "draft" | "confirmed" | "completed";
  items: EnrichedItem[];
};

type WeekFilter = {
  weekNumber: number;
  weekYear: number;
};

type ListHead = { id: string; status: "draft" | "confirmed" | "completed" } | null;

async function fetchListHeadByWeek(userId: string, weekNumber: number, weekYear: number): Promise<ListHead> {
  const { data: planData } = await supabase
    .from("user_meal_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("week_number", weekNumber)
    .eq("year", weekYear)
    .maybeSingle();

  if (!planData) return null;

  const { data, error } = await supabase
    .from("shopping_lists")
    .select("id, status")
    .eq("meal_plan_id", planData.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

async function fetchLatestListHead(userId: string): Promise<ListHead> {
  const { data, error } = await supabase
    .from("shopping_lists")
    .select("id, status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

async function fetchListItems(listId: string): Promise<EnrichedItem[]> {
  const { data, error } = await supabase
    .from("shopping_list_items")
    .select(`
      id, ingredient_id, product_id, quantity_needed, is_checked,
      ingredients(handle, is_pantry),
      products(name, category)
    `)
    .eq("shopping_list_id", listId);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    ingredient_id: row.ingredient_id,
    product_id: row.product_id,
    quantity_needed: row.quantity_needed,
    is_checked: row.is_checked,
    ingredient_handle: row.ingredients?.handle ?? "",
    is_pantry: row.ingredients?.is_pantry ?? false,
    product_name: row.products?.name ?? null,
    product_category: row.products?.category ?? null,
  }));
}

export function useShoppingListFull(userId: string | undefined, weekFilter?: WeekFilter) {
  const [list, setList] = useState<FullShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadList = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const head = weekFilter
        ? await fetchListHeadByWeek(userId, weekFilter.weekNumber, weekFilter.weekYear)
        : await fetchLatestListHead(userId);

      if (!head) {
        setList(null);
        return;
      }

      const items = await fetchListItems(head.id);
      setList({ id: head.id, status: head.status, items });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [userId, weekFilter?.weekNumber, weekFilter?.weekYear]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadList();
  }, [loadList]);

  const toggleItem = useCallback(async (itemId: string, checked: boolean) => {
    setList((prev) =>
      prev
        ? { ...prev, items: prev.items.map((i) => (i.id === itemId ? { ...i, is_checked: checked } : i)) }
        : prev,
    );
    await supabase.from("shopping_list_items").update({ is_checked: checked }).eq("id", itemId);
  }, []);

  const completeList = useCallback(async (listId: string) => {
    setList((prev) => (prev ? { ...prev, status: "completed" } : prev));
    await supabase
      .from("shopping_lists")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", listId);
  }, []);

  const quickComplete = useCallback(async (listId: string) => {
    setList((prev) =>
      prev
        ? { ...prev, status: "completed", items: prev.items.map((i) => ({ ...i, is_checked: true })) }
        : prev,
    );
    await supabase.from("shopping_list_items").update({ is_checked: true }).eq("shopping_list_id", listId);
    await supabase
      .from("shopping_lists")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", listId);
  }, []);

  return { list, loading, error, toggleItem, completeList, quickComplete };
}
