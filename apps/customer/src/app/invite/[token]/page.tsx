import { createClient } from "@supabase/supabase-js";
import { verifyInviteToken } from "@/lib/inviteToken";
import { InviteAcceptCta } from "./InviteAcceptCta";

type InvitePreview = {
  kind: "family" | "friend";
  inviter_name: string | null;
  family_name: string | null;
  expires_at: string;
  invitee_email: string | null;
};

async function loadInvitePreview(inviteId: string): Promise<InvitePreview | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  const { data, error } = await supabase
    .rpc("get_invite_preview", { invite_id: inviteId })
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as InvitePreview;
}

function InviteMessage({ title, message }: { title: string; message: string }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col items-center justify-center gap-3 bg-white px-6 text-center text-[#3A2A1F] md:max-w-[480px]">
      <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em]">{title}</h1>
      <p className="max-w-[280px] text-[16px] leading-[1.3] text-[#6F5B4B]">{message}</p>
    </main>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verified = await verifyInviteToken(token);

  if (!verified) {
    return (
      <InviteMessage
        title="This invite link isn't valid"
        message="It may have expired or already been used. Ask whoever sent it to send a new one."
      />
    );
  }

  const invite = await loadInvitePreview(verified.inviteId);

  if (!invite) {
    return (
      <InviteMessage
        title="This invite link isn't valid"
        message="It may have expired or already been used. Ask whoever sent it to send a new one."
      />
    );
  }

  const inviterName = invite.inviter_name || "Someone";
  const heading =
    invite.kind === "family"
      ? `${inviterName} invited you to join ${invite.family_name ?? "their family"} on numnums`
      : `${inviterName} wants to add you as a friend on numnums`;

  const description =
    invite.kind === "family"
      ? "Family members can see the week's plan, suggest swaps, and vote on what's cooking."
      : "Friends can see what's on each other's menu for the week.";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col bg-white px-6 pb-10 pt-16 text-[#3A2A1F] md:max-w-[480px]">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <p className="text-[24px] font-semibold leading-none tracking-[-0.02em]">numnums</p>
        <div className="space-y-2">
          <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.02em]">{heading}</h1>
          <p className="max-w-[300px] text-[16px] leading-[1.3] text-[#6F5B4B]">{description}</p>
        </div>
      </div>
      <InviteAcceptCta token={token} inviteeEmail={invite.invitee_email} />
    </main>
  );
}
