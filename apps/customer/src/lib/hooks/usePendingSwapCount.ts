"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { getCurrentWeek } from "@/lib/utils";

export function usePendingSwapCount(familyId: string | undefined, isOwner: boolean): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!familyId || !isOwner) return;
    let isMounted = true;
    const { week, year } = getCurrentWeek();

    void supabase
      .from("recipe_swap_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("family_id", familyId)
      .eq("week_number", week)
      .eq("year", year)
      .eq("status", "pending")
      .then(({ count: c }) => {
        if (isMounted) setCount(c ?? 0);
      });

    return () => { isMounted = false; };
  }, [familyId, isOwner]);

  return count;
}
