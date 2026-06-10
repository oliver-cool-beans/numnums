"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";

export type FamilyContext = {
  familyId: string;
  familyName: string;
  ownerId: string;
  ownerName: string | null;
  isOwner: boolean;
};

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

      const familyId = membership.family_id;

      const [familyResult, ownerResult] = await Promise.all([
        supabase.from("families").select("name").eq("id", familyId).maybeSingle(),
        membership.role === "owner"
          ? Promise.resolve({ data: { user_id: userId, user: null as { name: string | null } | null }, error: null })
          : supabase
              .from("family_members")
              .select("user_id, user:users(name)")
              .eq("family_id", familyId)
              .eq("role", "owner")
              .maybeSingle(),
      ]);

      if (familyResult.error || !familyResult.data) {
        console.error("[family-context] Failed to load family", familyResult.error);
        if (isMounted) setContext(null);
        return;
      }

      if (ownerResult.error || !ownerResult.data) {
        console.error("[family-context] Failed to load family owner", ownerResult.error);
        if (isMounted) setContext(null);
        return;
      }

      const ownerRow = ownerResult.data as { user_id: string; user: { name: string | null } | { name: string | null }[] | null };
      const ownerUser = Array.isArray(ownerRow.user) ? (ownerRow.user[0] ?? null) : ownerRow.user;

      if (isMounted) {
        setContext({
          familyId,
          familyName: familyResult.data.name,
          ownerId: ownerRow.user_id,
          ownerName: ownerUser?.name ?? null,
          isOwner: membership.role === "owner",
        });
      }
    };

    load();
    return () => { isMounted = false; };
  }, [userId]);

  return context;
}
