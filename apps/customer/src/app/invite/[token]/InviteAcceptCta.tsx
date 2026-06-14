"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { useAuth } from "@/lib/auth-context";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export function InviteAcceptCta({ token, inviteeEmail }: { token: string; inviteeEmail: string | null }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Already signed in — no need to round-trip through email confirmation;
  // hand straight off to the one place that finalizes acceptance.
  useEffect(() => {
    if (!loading && user) {
      router.replace(`/invite/${token}/accept`);
    }
  }, [loading, user, router, token]);

  if (loading || user) {
    return <LoadingScreen title="numnums" message="Just a moment..." />;
  }

  return (
    <div className="flex flex-col gap-3">
      <MagicLinkForm
        destination={`/invite/${token}/accept`}
        lockedEmail={inviteeEmail ?? undefined}
        helperText={
          inviteeEmail
            ? "This invite was sent to your email — confirm it's you and we'll set up your account."
            : "We'll email you a code to confirm and set up your account — no password needed."
        }
      />
      <p className="text-center text-[13px] leading-[1.3] text-[#6F5B4B]">
        Confirming also creates your numnums account if you don&apos;t already have one.
      </p>
    </div>
  );
}
