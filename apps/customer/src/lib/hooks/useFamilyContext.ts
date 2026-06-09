"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";

export type FamilyContext = { familyId: string; ownerId: string; isOwner: boolean };

/**
 * Resolves the current user's family membership (if any) so pages outside
 * the Family tab — like the week view — can show family-aware swap options.
 * `undefined` while loading, `null` when the user isn't part of a family.
 */
export function useFamilyContext(userId: string | undefined): FamilyContext | null | undefined {
  const [context, setContext] = useState<FamilyContext | null | undefined>(undefined);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;

    const load = async () => {
      const { data: membership, error } = await supabase
        .from("family_members")
        .select("family_id, role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !membership) {
        if (error) console.error("[family-context] Failed to load family membership", error);
        if (isMounted) setContext(null);
        return;
      }

      if (membership.role === "owner") {
        if (isMounted) setContext({ familyId: membership.family_id, ownerId: userId, isOwner: true });
        return;
      }

      const { data: owner, error: ownerError } = await supabase
        .from("family_members")
        .select("user_id")
        .eq("family_id", membership.family_id)
        .eq("role", "owner")
        .maybeSingle();

      if (ownerError || !owner) {
        if (ownerError) console.error("[family-context] Failed to load family owner", ownerError);
        if (isMounted) setContext(null);
        return;
      }

      if (isMounted) setContext({ familyId: membership.family_id, ownerId: owner.user_id, isOwner: false });
    };

    load();
    return () => { isMounted = false; };
  }, [userId]);

  return context;
}
