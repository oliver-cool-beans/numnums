"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase-client";
import { createFriendInvite } from "@/lib/inviteActions";
import { maybeQueueFriendInviteSentPrompt } from "@/lib/notificationPrompts";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { InviteBlock } from "@/components/dashboard/InviteBlock";

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
  const { friends } = useFriends(user?.id);

  if (loading) {
    return <LoadingScreen title="Friends" message="Just a moment..." />;
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
          <h1 className="text-2xl font-semibold text-[#3A2A1F]">Friends</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-10">
        <InviteBlock
          userId={user?.id}
          kind="friend"
          label="Invite a friend by"
          createInvite={createFriendInvite}
          onSent={maybeQueueFriendInviteSentPrompt}
        />

        <div className="mt-6">
          <h2 className="px-1 text-sm font-semibold text-[#6F5B4B]">Your friends</h2>

          {friends === null && <p className="mt-3 px-1 text-sm text-[#9E8B7E]">Loading...</p>}

          {friends?.length === 0 && (
            <p className="mt-3 px-1 text-sm text-[#9E8B7E]">No friends yet — send an invite to get started.</p>
          )}

          {friends && friends.length > 0 && (
            <div className="mt-3 divide-y divide-[#F0E8DE] overflow-hidden rounded-2xl border border-[#F0E8DE]">
              {friends.map((friend) => (
                <div key={friend.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E7D9CD] text-sm font-semibold text-[#3A2A1F]">
                    {friend.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <p className="text-sm text-[#3A2A1F]">{friend.name || "Friend"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
