"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase-client";
import { createFamilyInvite } from "@/lib/inviteActions";
import { toast } from "@/lib/toast";
import { maybeQueueFamilyCreatedPrompt, maybeQueueFamilyInviteSentPrompt } from "@/lib/notificationPrompts";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { SubPageShell } from "@/components/dashboard/SubPageShell";
import { InviteBlock } from "@/components/dashboard/InviteBlock";
import { usePendingInvites, type PendingInvite } from "@/lib/hooks/usePendingInvites";

type Member = { user_id: string; role: "owner" | "member"; name: string | null; invitee_email: string | null };
type Family = { id: string; name: string; members: Member[] };

function useFamilies(userId: string | undefined) {
  const [families, setFamilies] = useState<Family[] | null>(null);
  const loadRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      const { data: memberships, error: membershipError } = await supabase
        .from("family_members")
        .select("family_id")
        .eq("user_id", userId);

      if (membershipError || !memberships?.length) {
        if (membershipError) console.error("[groups] Failed to load memberships", membershipError);
        setFamilies([]);
        return;
      }

      const familyIds = memberships.map((m) => m.family_id);

      const [{ data: familyRows, error: familyError }, { data: memberRows, error: memberError }] = await Promise.all([
        supabase.from("families").select("id, name").in("id", familyIds),
        supabase
          .from("family_members")
          .select("family_id, user_id, role, invitee_email, user:users(id, name)")
          .in("family_id", familyIds),
      ]);

      if (familyError || memberError) {
        console.error("[groups] Failed to load families", familyError ?? memberError);
        setFamilies([]);
        return;
      }

      type MemberRow = { family_id: string; user_id: string; role: "owner" | "member"; invitee_email: string | null; user: { id: string; name: string | null } | { id: string; name: string | null }[] | null };

      const single = (value: MemberRow["user"]) => (Array.isArray(value) ? (value[0] ?? null) : value);

      const list: Family[] = (familyRows ?? []).map((family) => ({
        id: family.id,
        name: family.name,
        members: ((memberRows ?? []) as MemberRow[])
          .filter((row) => row.family_id === family.id)
          .map((row) => ({ user_id: row.user_id, role: row.role, name: single(row.user)?.name ?? null, invitee_email: row.invitee_email ?? null })),
      }));

      setFamilies(list);
    };

    loadRef.current = load;
    void load();

    // accept_invite is SECURITY DEFINER so its inserts may be dropped by
    // Supabase Realtime RLS evaluation. Subscribe to both the current user's
    // own membership changes and any invite-table changes so whichever event
    // arrives first triggers a reload. Window focus is the reliable fallback.
    const channel = supabase
      .channel(`families:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "family_members", filter: `user_id=eq.${userId}` },
        () => { void loadRef.current(); },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "invites", filter: `inviter_id=eq.${userId}` },
        () => { void loadRef.current(); },
      )
      .subscribe();

    const onFocus = () => { void loadRef.current(); };
    window.addEventListener("focus", onFocus);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId]);

  // After we know the family, subscribe to member changes within it so the
  // owner sees new members join without a manual refresh.
  const familyId = families?.[0]?.id;
  useEffect(() => {
    if (!familyId) return;

    const channel = supabase
      .channel(`family-members:${familyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "family_members", filter: `family_id=eq.${familyId}` },
        () => { void loadRef.current(); },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [familyId]);

  const reload = useCallback(() => { void loadRef.current(); }, []);

  return { families, reload };
}

function InviteLinkPanel({ familyId, onAfterSent }: { familyId: string; onAfterSent?: () => void }) {
  const { user } = useAuth();

  return (
    <div className="mt-4">
      <InviteBlock
        userId={user?.id}
        kind="family"
        familyId={familyId}
        label="Invite a family member by"
        createInvite={(email) => createFamilyInvite(familyId, email)}
        onSent={async (uid) => { await maybeQueueFamilyInviteSentPrompt(uid); onAfterSent?.(); }}
      />
    </div>
  );
}

function CreateFamilyPanel({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;

    setCreating(true);

    const { error: createError } = await supabase.rpc("create_family", { family_name: trimmed });

    if (createError) {
      toast.error(createError.message || "Could not create the family");
      setCreating(false);
      return;
    }

    setName("");
    setCreating(false);
    if (user?.id) await maybeQueueFamilyCreatedPrompt(user.id);
    onCreated();
  }

  return (
    <div className="rounded-2xl bg-[#F5EDE6] p-4">
      <p className="text-sm leading-[1.4] text-[#6F5B4B]">
        Create a family to plan the week together — members can suggest swaps and vote, and you build the final plan.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Family name"
          className="flex-1 rounded-[14px] border border-[#E7D9CD] bg-white px-3 py-2.5 text-sm text-[#3A2A1F] outline-none focus:border-[#7CB342]"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !name.trim()}
          className="shrink-0 rounded-[14px] bg-[#7CB342] px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] active:bg-[#558B2F] disabled:opacity-60"
        >
          {creating ? "Creating..." : "Create"}
        </button>
      </div>
    </div>
  );
}

function FamilyContent({
  families,
  userId,
  reload,
}: {
  families: Family[] | null;
  userId: string | undefined;
  reload: () => void;
}) {
  const family = families?.[0];
  const isOwner = family?.members.some((m) => m.user_id === userId && m.role === "owner") ?? false;
  const { invites: pendingInvites, revoke: revokePendingInvite, reload: reloadInvites } = usePendingInvites(
    isOwner ? userId : undefined,
    "family",
    family?.id,
  );
  const [leaving, setLeaving] = useState(false);

  async function handleLeaveFamily() {
    if (!family) return;
    setLeaving(true);
    const { error } = await supabase.rpc("leave_family", { p_family_id: family.id });
    setLeaving(false);
    if (error) {
      toast.error(error.message || "Could not leave the family");
      return;
    }
    reload();
  }

  if (families === null) {
    return <p className="px-1 text-sm text-[#9E8B7E]">Loading...</p>;
  }

  if (families.length === 0) {
    return (
      <>
        <p className="px-1 text-sm text-[#9E8B7E]">You&apos;re not part of a family yet.</p>
        <div className="mt-4">
          <CreateFamilyPanel onCreated={reload} />
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="mb-3 px-1 text-base font-semibold text-[#3A2A1F]">{family!.name}</h2>
      <div className="rounded-xl border border-[#F0E8DE] p-4">
        <ul className="divide-y divide-[#F0E8DE]">
          {family!.members.map((member) => (
            <li key={member.user_id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <span className="text-sm text-[#3A2A1F]">{member.name || member.invitee_email || "Member"}</span>
              {member.role === "owner" && (
                <span className="rounded-full bg-[#E7F6DF] px-2 py-0.5 text-[0.68rem] font-semibold text-[#558B2F]">
                  Planner
                </span>
              )}
            </li>
          ))}
        </ul>
        {isOwner && <InviteLinkPanel familyId={family!.id} onAfterSent={reloadInvites} />}
      </div>
      {isOwner && <FamilyPendingInvites invites={pendingInvites} revoke={revokePendingInvite} />}
      {!isOwner && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => void handleLeaveFamily()}
            disabled={leaving}
            className="w-full rounded-[14px] border border-[#E7D9CD] bg-white px-4 py-3 text-sm font-medium text-[#C0392B] transition-colors hover:bg-[#FDF5F5] disabled:opacity-60"
          >
            {leaving ? "Leaving..." : "Leave family"}
          </button>
        </div>
      )}
    </>
  );
}

function FamilyPendingInvites({ invites, revoke }: { invites: PendingInvite[] | null; revoke: (id: string) => Promise<boolean> }) {
  if (!invites?.length) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[#9E8B7E]">Pending invites</p>
      <ul className="divide-y divide-[#F0E8DE] rounded-xl border border-[#F0E8DE]">
        {invites.map((inv) => (
          <li key={inv.id} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-[#3A2A1F]">{inv.invitee_email ?? "Invite link"}</span>
            <button
              type="button"
              onClick={() => void revoke(inv.id)}
              className="text-xs text-[#9E8B7E] underline underline-offset-2 transition-colors hover:text-[#E85D5D]"
            >
              Revoke
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function GroupsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { families, reload } = useFamilies(user?.id);

  if (loading) {
    return <LoadingScreen title="Family" message="Just a moment..." />;
  }

  return (
    <SubPageShell>
      <main className="mx-auto flex h-full w-full max-w-[390px] flex-col bg-white md:h-auto md:max-w-[600px] md:rounded-[28px] md:shadow-[0_4px_40px_rgba(58,42,31,0.10)] md:overflow-hidden">
        <header className="flex items-center gap-3 px-5 pb-3 pt-14">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#3A2A1F] shadow-sm transition-colors hover:bg-[#F5EDE0]"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-[#3A2A1F]">Family</h1>
          </div>
        </header>

        <div className="mx-5 mb-2 rounded-xl bg-[#F5EDE6] px-3 py-2 text-xs text-[#8A6F5C]">
          The planner builds the week — everyone else can suggest swaps for review.
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-10">
          <FamilyContent families={families} userId={user?.id} reload={reload} />
        </div>
      </main>
    </SubPageShell>
  );
}
