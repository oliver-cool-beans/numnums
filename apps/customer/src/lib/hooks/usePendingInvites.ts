"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase-client";

export type PendingInvite = {
  id: string;
  invitee_email: string | null;
  expires_at: string;
};

export function usePendingInvites(userId: string | undefined, kind: "friend" | "family", familyId?: string) {
  const [invites, setInvites] = useState<PendingInvite[] | null>(null);
  // Stable ref so revoke() and the focus handler can call load() without being
  // inside the effect or causing a re-subscription.
  const loadRef = useRef<() => Promise<void>>(async () => {});

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
        return;
      }

      setInvites(data ?? []);
    };

    loadRef.current = load;
    void load();

    // accept_invite (security definer) deletes the invite row and inserts into
    // family_members/friendships atomically. DELETE events from security-definer
    // functions can be dropped by Supabase Realtime's RLS evaluation, so we
    // subscribe to both tables: whichever event arrives first triggers the reload.
    const secondaryChange =
      kind === "family" && familyId
        ? { table: "family_members" as const, filter: `family_id=eq.${familyId}` }
        : { table: "friendships" as const, filter: `requester_id=eq.${userId}` };

    const channel = supabase
      .channel(`pending-invites:${userId}:${kind}:${familyId ?? ""}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invites", filter: `inviter_id=eq.${userId}` },
        () => { void load(); },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", ...secondaryChange },
        () => { void load(); },
      )
      .subscribe();

    const onFocus = () => { void load(); };
    window.addEventListener("focus", onFocus);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId, kind, familyId]);

  const reload = useCallback(() => { void loadRef.current(); }, []);

  const revoke = useCallback(async (inviteId: string) => {
    setInvites((prev) => prev?.filter((i) => i.id !== inviteId) ?? prev);

    const { error } = await supabase
      .from("invites")
      .delete()
      .eq("id", inviteId);

    if (error) {
      console.error("[pending-invites] Failed to revoke invite", error);
      void loadRef.current();
      return false;
    }

    return true;
  }, []);

  return { invites, reload, revoke };
}
