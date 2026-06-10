"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase-client";
import { createFriendInvite } from "@/lib/inviteActions";
import { maybeQueueFriendInviteSentPrompt } from "@/lib/notificationPrompts";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { SubPageShell } from "@/components/dashboard/SubPageShell";
import { InviteBlock } from "@/components/dashboard/InviteBlock";
import { useFriendsToday } from "@/lib/hooks/useFriendsToday";
import { usePendingInvites } from "@/lib/hooks/usePendingInvites";

type Friend = { id: string; name: string | null };

function useFriends(userId: string | undefined) {
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const loadFriends = async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id, requester:users!friendships_requester_id_fkey(id, name), addressee:users!friendships_addressee_id_fkey(id, name)")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      if (error) {
        console.error("[friends] Failed to load friends", error);
        setFriends([]);
        return;
      }

      type Row = {
        requester_id: string;
        addressee_id: string;
        requester: Friend | Friend[] | null;
        addressee: Friend | Friend[] | null;
      };

      const single = (value: Friend | Friend[] | null): Friend | null =>
        Array.isArray(value) ? (value[0] ?? null) : value;

      const list = ((data ?? []) as Row[]).map((row) => {
        const other = row.requester_id === userId ? single(row.addressee) : single(row.requester);
        return other;
      }).filter((friend): friend is Friend => Boolean(friend));

      setFriends(list);
    };

    loadFriends();
  }, [userId, refreshKey]);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

  return { friends, reload };
}

export default function FriendsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { friends, reload } = useFriends(user?.id);
  const { friendsToday } = useFriendsToday(user?.id);
  const { invites, revoke, reload: reloadInvites } = usePendingInvites(user?.id, "friend");

  const todayByFriendId = new Map(friendsToday?.map((ft) => [ft.friend.id, ft.recipe]) ?? []);

  if (loading) {
    return <LoadingScreen title="Friends" message="Just a moment..." />;
  }

  return (
    <SubPageShell>
      <main className="mx-auto flex h-full w-full max-w-[390px] flex-col bg-white md:h-auto md:max-w-[600px] md:rounded-[28px] md:shadow-[0_4px_40px_rgba(58,42,31,0.10)] md:overflow-hidden">
        <header className="flex items-center gap-3 px-5 pb-3 pt-14">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#3A2A1F] shadow-sm transition-colors hover:bg-[#F5EDE0]"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-[#3A2A1F]">Friends</h1>
          </div>
        </header>

        <div className="mx-5 mb-2 rounded-xl bg-[#F5EDE6] px-3 py-2 text-xs text-[#8A6F5C]">
          See what friends are cooking tonight. Invite more to grow your circle.
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-10">
          <InviteBlock
            userId={user?.id}
            kind="friend"
            label="Invite a friend by"
            createInvite={createFriendInvite}
            onSent={(uid) => { void maybeQueueFriendInviteSentPrompt(uid); reload(); reloadInvites(); }}
          />

          {invites && invites.length > 0 && (
            <div className="mt-5">
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[#9E8B7E]">Pending invites</h2>
              <ul className="divide-y divide-[#F0E8DE] rounded-2xl border border-[#F0E8DE]">
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
          )}

          <div className="mt-5">
            <h2 className="px-1 text-sm font-semibold text-[#6F5B4B]">Your friends</h2>

            {friends === null && <p className="mt-3 px-1 text-sm text-[#9E8B7E]">Loading...</p>}

            {friends?.length === 0 && (
              <p className="mt-3 px-1 text-sm text-[#9E8B7E]">No friends yet — send an invite above to get started.</p>
            )}

            {friends && friends.length > 0 && (
              <div className="mt-3 divide-y divide-[#F0E8DE] overflow-hidden rounded-2xl border border-[#F0E8DE]">
                {friends.map((friend) => {
                  const todayRecipe = todayByFriendId.get(friend.id);
                  return (
                    <div key={friend.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7D9CD] text-sm font-semibold text-[#3A2A1F]">
                        {friend.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#3A2A1F]">{friend.name || "Friend"}</p>
                        {todayRecipe !== undefined && (
                          <p className="truncate text-xs text-[#9E8B7E]">
                            {todayRecipe ? `Cooking ${todayRecipe.name} tonight` : "Taking tonight off"}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </SubPageShell>
  );
}
