"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";

export type ShoppingListItem = {
  id: string;
  ingredient_id: string;
  product_id: string | null;
  quantity_needed: number;
  quantity_purchased: number;
  is_checked: boolean;
};

export type ShoppingList = {
  id: string;
  status: "draft" | "confirmed" | "completed";
  items: ShoppingListItem[];
  created_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
};

export function useShoppingList(userId: string | undefined) {
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const fetchShoppingList = async () => {
      try {
        // Fetch the current/latest shopping list
        const { data: listData, error: listError } = await supabase
          .from("shopping_lists")
          .select("id, status, created_at, confirmed_at, completed_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (listError && listError.code !== "PGRST116") throw listError;

        if (!listData) {
          setList(null);
          return;
        }

        // Fetch shopping list items
        const { data: itemsData, error: itemsError } = await supabase
          .from("shopping_list_items")
          .select("id, ingredient_id, product_id, quantity_needed, quantity_purchased, is_checked")
          .eq("shopping_list_id", listData.id);

        if (itemsError) throw itemsError;

        setList({
          id: listData.id,
          status: listData.status,
          items: itemsData || [],
          created_at: listData.created_at,
          confirmed_at: listData.confirmed_at,
          completed_at: listData.completed_at,
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchShoppingList();
  }, [userId]);

  return { list, loading, error };
}
