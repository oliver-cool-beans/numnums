"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { maybeQueueFriendInviteAcceptedPrompt } from "@/lib/notificationPrompts";

type State =
  | { status: "waiting" }
  | { status: "joining" }
  | { status: "done" }
  | { status: "error"; message: string };

export function FinalizeInviteAcceptance({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "waiting" });
  const hasStartedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const acceptWithSession = async (userId: string) => {
      if (hasStartedRef.current) {
        return;
      }
      hasStartedRef.current = true;

      if (cancelled) return;
      setState({ status: "joining" });

      const { data: kind, error } = await supabase.rpc("accept_invite", { invite_id: inviteId });

      if (cancelled) return;

      if (error) {
        console.error("[invite-accept] Failed to accept invite", error);
        setState({
          status: "error",
          message: error.message || "We couldn't complete the invite. It may have expired or already been used.",
        });
        return;
      }

      await maybeQueueFriendInviteAcceptedPrompt(userId);

      setState({ status: "done" });

      if (kind === "family") {
        const { data: profile } = await supabase.from("users").select("name").eq("id", userId).single();
        if (!profile?.name) {
          router.replace("/setup/name?next=/dashboard");
          return;
        }
      }

      router.replace("/dashboard");
    };

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        void acceptWithSession(session.user.id);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void acceptWithSession(session.user.id);
      }
    });

    void checkSession();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [inviteId, router]);

  if (state.status === "error") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col items-center justify-center gap-3 bg-white px-6 text-center text-[#3A2A1F] md:max-w-[480px]">
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em]">Couldn&apos;t join</h1>
        <p className="max-w-[280px] text-[16px] leading-[1.3] text-[#6F5B4B]">{state.message}</p>
      </main>
    );
  }

  return (
    <LoadingScreen
      title={state.status === "joining" ? "Joining" : "Signing you in"}
      message={state.status === "joining" ? "Just a moment while we set things up..." : "Hang tight..."}
    />
  );
}
