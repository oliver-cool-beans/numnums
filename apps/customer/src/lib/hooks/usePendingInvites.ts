"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";

export type PendingInvite = {
  id: string;
  invitee_email: string | null;
  expires_at: string;
};

/**
 * Invites the current user has sent that are still awaiting a response —
 * shown so they can see who they're waiting on and cancel if needed. Scoped
 * to `kind` (and `familyId` for family invites) so the friends and family
 * pages each see only their own.
 */
export function usePendingInvites(userId: string | undefined, kind: "friend" | "family", familyId?: string) {
  const [invites, setInvites] = useState<PendingInvite[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      let query = supabase
        .from("invites")
        .select("id, invitee_email, expires_at")
        .eq("inviter_id", userId)
        .eq("kind", kind)
        .order("created_at", { ascending: false });

      if (kind === "family" && familyId) {
        query = query.eq("family_id", familyId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("[pending-invites] Failed to load pending invites", error);
        setInvites([]);
        return;
      }

      setInvites(data ?? []);
    };

    load();
  }, [userId, kind, familyId, refreshKey]);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

  const revoke = useCallback(
    async (inviteId: string) => {
      const { error } = await supabase
        .from("invites")
        .delete()
        .eq("id", inviteId);

      if (error) {
        console.error("[pending-invites] Failed to revoke invite", error);
        return false;
      }

      reload();
      return true;
    },
    [reload],
  );

  return { invites, reload, revoke };
}
