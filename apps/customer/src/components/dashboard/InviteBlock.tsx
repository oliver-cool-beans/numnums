"use client";

import { useCallback, useState, type FormEvent } from "react";
import Image from "next/image";
import { Copy, Check, Link2, Mail, QrCode, Share, X } from "lucide-react";
import QRCode from "react-qr-code";
import { usePendingInvites } from "@/lib/hooks";
import { PendingInvitesList } from "@/components/dashboard/PendingInvitesList";
import type { CreatedInvite } from "@/lib/inviteActions";

type InviteMode = "link" | "qr" | "email" | null;

type InviteBlockProps = {
  userId: string | undefined;
  kind: "friend" | "family";
  familyId?: string;
  label: string;
  createInvite: (email?: string) => Promise<CreatedInvite>;
  onSent?: (userId: string) => void | Promise<void>;
};

export function InviteBlock({ userId, kind, familyId, label, createInvite, onSent }: InviteBlockProps) {
  const { invites: pendingInvites, reload: reloadPendingInvites, revoke: revokePendingInvite } = usePendingInvites(
    userId,
    kind,
    familyId,
  );
  const [link, setLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<InviteMode>(null);
  const [emailInput, setEmailInput] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const [canShare] = useState(() => globalThis.navigator !== undefined && globalThis.navigator.share !== undefined);

  const ensureLink = useCallback(async (): Promise<string | null> => {
    if (link) return link;

    setGenerating(true);
    setError(null);

    try {
      const invite = await createInvite();
      setLink(invite.url);
      if (userId) await onSent?.(userId);
      reloadPendingInvites();
      return invite.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the invite link");
      return null;
    } finally {
      setGenerating(false);
    }
  }, [link, userId, createInvite, onSent, reloadPendingInvites]);

  async function handleShowLink() {
    setCopied(false);
    const url = await ensureLink();
    if (url) setMode("link");
  }

  async function handleShare() {
    setError(null);
    const url = await ensureLink();
    if (!url) return;

    try {
      await navigator.share({
        title: "numnums",
        text: kind === "family" ? "Join my family on numnums" : "Add me as a friend on numnums",
        url,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[invite-block] Failed to open share sheet", err);
    }
  }

  async function handleShowQr() {
    const url = await ensureLink();
    if (url) setMode("qr");
  }

  function handleShowEmailForm() {
    setError(null);
    setEmailSentTo(null);
    setMode("email");
  }

  async function handleSendEmail(e: FormEvent) {
    e.preventDefault();
    const trimmed = emailInput.trim();
    if (!trimmed) return;

    setSendingEmail(true);
    setError(null);

    try {
      await createInvite(trimmed);
      if (userId) await onSent?.(userId);
      reloadPendingInvites();
      setEmailSentTo(trimmed);
      setEmailInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the invite");
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleCopy() {
    if (!link) return;

    try {
      await globalThis.navigator.clipboard.writeText(link);
      setCopied(true);
      globalThis.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[invite-block] Failed to copy invite link", err);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-[#9E8B7E]">{label}</p>
        <div className="flex items-center gap-1.5">
          {canShare && (
            <button
              type="button"
              onClick={handleShare}
              disabled={generating}
              aria-label="Share invite"
              title="Share invite"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#6F5B4B] transition-colors hover:bg-[#F5EDE6] disabled:opacity-50"
            >
              <Share className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleShowEmailForm}
            disabled={generating}
            aria-label="Invite by email"
            title="Invite by email"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#6F5B4B] transition-colors hover:bg-[#F5EDE6] disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleShowLink}
            disabled={generating}
            aria-label="Invite by link"
            title="Invite by link"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#6F5B4B] transition-colors hover:bg-[#F5EDE6] disabled:opacity-50"
          >
            <Link2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleShowQr}
            disabled={generating}
            aria-label="Invite by QR code"
            title="Invite by QR code"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#6F5B4B] transition-colors hover:bg-[#F5EDE6] disabled:opacity-50"
          >
            <QrCode className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && <p className="mt-2 px-1 text-sm text-red-500">{error}</p>}

      {mode === "link" && link && (
        <div className="mt-2 flex items-center gap-2 rounded-[14px] border border-[#E7D9CD] bg-white px-3 py-2.5">
          <p className="flex-1 truncate text-sm text-[#3A2A1F]">{link}</p>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy invite link"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#6F5B4B] transition-colors hover:bg-[#F5EDE6]"
          >
            {copied ? <Check className="h-4 w-4 text-[#7CB342]" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      )}

      {mode === "email" && (
        <div className="mt-2 rounded-[14px] border border-[#E7D9CD] bg-white px-3 py-2.5">
          {emailSentTo ? (
            <p className="text-sm text-[#3A2A1F]">
              Invite sent to <span className="font-medium">{emailSentTo}</span>.
            </p>
          ) : (
            <form onSubmit={handleSendEmail} className="flex items-center gap-2">
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder={kind === "family" ? "name@email.com" : "friend@email.com"}
                className="flex-1 text-sm text-[#3A2A1F] outline-none placeholder:text-[#9E8B7E]"
              />
              <button
                type="submit"
                disabled={sendingEmail || !emailInput.trim()}
                className="shrink-0 rounded-[10px] bg-[#7CB342] px-3 py-1.5 text-xs font-semibold text-white transition-all active:scale-[0.98] active:bg-[#558B2F] disabled:opacity-60"
              >
                {sendingEmail ? "Sending..." : "Send"}
              </button>
            </form>
          )}
        </div>
      )}

      {pendingInvites && <PendingInvitesList invites={pendingInvites} onRevoke={revokePendingInvite} />}

      {mode === "qr" && link && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white px-8">
          <button
            type="button"
            onClick={() => setMode(null)}
            aria-label="Close QR code"
            className="absolute right-5 top-14 flex h-10 w-10 items-center justify-center rounded-full text-[#3A2A1F] shadow-sm transition-colors hover:bg-[#F5EDE0]"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative h-[120px] w-[120px]">
            <Image src="/pot.png" alt="" fill priority sizes="120px" className="object-contain" />
          </div>
          <p className="text-center text-sm text-[#6F5B4B]">Scan this code to accept your invite</p>
          <div className="rounded-[24px] border border-[#F0E8DE] p-6">
            <QRCode value={link} size={220} fgColor="#3A2A1F" bgColor="#FFFFFF" />
          </div>
        </div>
      )}
    </>
  );
}
