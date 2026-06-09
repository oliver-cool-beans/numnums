"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase-client";
import { createFamilyInvite } from "@/lib/inviteActions";
import { maybeQueueFamilyCreatedPrompt, maybeQueueFamilyInviteSentPrompt } from "@/lib/notificationPrompts";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { InviteBlock } from "@/components/dashboard/InviteBlock";

type Member = { user_id: string; role: "owner" | "member"; name: string | null };
type Family = { id: string; name: string; members: Member[] };

function useFamilies(userId: string | undefined) {
  const [families, setFamilies] = useState<Family[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const loadFamilies = async () => {
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
          .select("family_id, user_id, role, user:users(id, name)")
          .in("family_id", familyIds),
      ]);

      if (familyError || memberError) {
        console.error("[groups] Failed to load families", familyError ?? memberError);
        setFamilies([]);
        return;
      }

      type MemberRow = { family_id: string; user_id: string; role: "owner" | "member"; user: { id: string; name: string | null } | { id: string; name: string | null }[] | null };

      const single = (value: MemberRow["user"]) => (Array.isArray(value) ? (value[0] ?? null) : value);

      const list: Family[] = (familyRows ?? []).map((family) => ({
        id: family.id,
        name: family.name,
        members: ((memberRows ?? []) as MemberRow[])
          .filter((row) => row.family_id === family.id)
          .map((row) => ({ user_id: row.user_id, role: row.role, name: single(row.user)?.name ?? null })),
      }));

      setFamilies(list);
    };

    loadFamilies();
  }, [userId, refreshKey]);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

  return { families, reload };
}

function InviteLinkPanel({ familyId }: { familyId: string }) {
  const { user } = useAuth();

  return (
    <div className="mt-4">
      <InviteBlock
        userId={user?.id}
        kind="family"
        familyId={familyId}
        label="Invite a family member by"
        createInvite={(email) => createFamilyInvite(familyId, email)}
        onSent={maybeQueueFamilyInviteSentPrompt}
      />
    </div>
  );
}

function CreateFamilyPanel({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;

    setCreating(true);
    setError(null);

    const { error: createError } = await supabase.rpc("create_family", { family_name: trimmed });

    if (createError) {
      setError(createError.message || "Could not create the family");
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
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
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
    <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col bg-white md:min-h-0 md:max-w-[600px] md:rounded-[28px] md:shadow-[0_4px_40px_rgba(58,42,31,0.10)] md:overflow-hidden">
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
        One plan, shared by the whole family — everyone plans together.
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-10">
        {families === null ? (
          <p className="px-1 text-sm text-[#9E8B7E]">Loading...</p>
        ) : families.length === 0 ? (
          <>
            <p className="px-1 text-sm text-[#9E8B7E]">You&apos;re not part of a family yet.</p>
            <div className="mt-4">
              <CreateFamilyPanel onCreated={reload} />
            </div>
          </>
        ) : (
          (() => {
            const family = families[0];
            const isOwner = family.members.some((m) => m.user_id === user?.id && m.role === "owner");

            return (
              <>
                <h2 className="mb-3 px-1 text-base font-semibold text-[#3A2A1F]">{family.name}</h2>
                <div className="rounded-xl border border-[#F0E8DE] p-4">
                <ul className="space-y-1">
                  {family.members.map((member) => (
                    <li key={member.user_id} className="text-sm text-[#3A2A1F]">
                      {member.name || "Member"}
                    </li>
                  ))}
                </ul>

                {isOwner && <InviteLinkPanel familyId={family.id} />}
              </div>
              </>
            );
          })()
        )}
      </div>
    </main>
  );
}
