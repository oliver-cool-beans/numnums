import { verifyInviteToken } from "@/lib/inviteToken";
import { FinalizeInviteAcceptance } from "./FinalizeInviteAcceptance";

function InviteMessage({ title, message }: { title: string; message: string }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col items-center justify-center gap-3 bg-white px-6 text-center text-[#3A2A1F] md:max-w-[480px]">
      <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em]">{title}</h1>
      <p className="max-w-[280px] text-[16px] leading-[1.3] text-[#6F5B4B]">{message}</p>
    </main>
  );
}

export default async function InviteAcceptPage({
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

  return <FinalizeInviteAcceptance inviteId={verified.inviteId} />;
}
