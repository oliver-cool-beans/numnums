"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { ConfirmBar } from "@/components/ui";
import type { PendingInvite } from "@/lib/hooks";

function formatExpiry(expiresAt: string): string {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

export function PendingInvitesList({
  invites,
  onRevoke,
}: {
  invites: PendingInvite[];
  onRevoke: (inviteId: string) => Promise<boolean>;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  if (invites.length === 0) return null;

  async function handleConfirmRevoke(id: string) {
    setRevokingId(id);
    await onRevoke(id);
    setRevokingId(null);
    setConfirmingId(null);
  }

  return (
    <div className="mt-6">
      <h2 className="px-1 text-sm font-semibold text-[#6F5B4B]">Pending invites</h2>
      <div className="mt-3 divide-y divide-[#F0E8DE] overflow-hidden rounded-2xl border border-[#F0E8DE]">
        {invites.map((invite) => (
          <div key={invite.id} className="flex items-center gap-3 px-4 py-3">
            {confirmingId === invite.id ? (
              <ConfirmBar
                message="Cancel this invite?"
                confirmLabel="Cancel invite"
                cancelLabel="Keep"
                busy={revokingId === invite.id}
                onConfirm={() => handleConfirmRevoke(invite.id)}
                onCancel={() => setConfirmingId(null)}
              />
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[#3A2A1F]">{invite.invitee_email || "Shared invite link"}</p>
                  <p className="text-xs text-[#9E8B7E]">{formatExpiry(invite.expires_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmingId(invite.id)}
                  aria-label="Cancel invite"
                  title="Cancel invite"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9E8B7E] transition-colors hover:bg-[#F5EDE6] hover:text-[#3A2A1F]"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
