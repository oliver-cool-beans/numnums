"use client";

import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";

const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL;
const DEV_PASSWORD = process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type MagicLinkFormProps = {
  /**
   * Path (with query) to land on once the link is clicked, e.g.
   * "/auth/complete?next=/dashboard". Resolved against window.location.origin
   * inside the submit handler — never at render time — so this stays SSR-safe.
   */
  redirectPath: string;
  /** When known up front (e.g. an email invite), skip the input and confirm sending to this address. */
  lockedEmail?: string;
  helperText?: string;
  className?: string;
};

/**
 * Passwordless sign-in: Supabase emails a one-time link, clicking it
 * establishes a session via /auth/complete (PKCE — same redirect handling as
 * the old OAuth flow). Account creation happens implicitly on first
 * verification, so this is also how new users register.
 */
export function MagicLinkForm({ redirectPath, lockedEmail, helperText, className }: MagicLinkFormProps) {
  const [email, setEmail] = useState(lockedEmail ?? "");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isValidEmail = EMAIL_PATTERN.test(email.trim());

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!isValidEmail || status === "sending") return;

    setStatus("sending");
    setError(null);

    const redirectTo = new URL(redirectPath, globalThis.window.location.origin).toString();

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });

    if (otpError) {
      console.error("[magic-link] Failed to send sign-in link", { message: otpError.message, status: otpError.status, code: (otpError as { code?: string }).code, cause: otpError.cause });
      setError(otpError.message || "Could not send the link. Try again in a moment.");
      setStatus("idle");
      return;
    }

    setStatus("sent");
  }

  async function handleDevBypass() {
    if (!DEV_EMAIL || !DEV_PASSWORD) return;
    setStatus("sending");
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: DEV_EMAIL, password: DEV_PASSWORD });
    if (signInError) {
      setError(signInError.message);
      setStatus("idle");
      return;
    }
    const next = new URL(redirectPath, globalThis.window.location.origin);
    router.push(next.pathname + next.search);
  }

  if (status === "sent") {
    return (
      <div className={cn("rounded-[20px] border border-[#E7D9CD] bg-[#F5EDE6] px-5 py-4 text-center", className)}>
        <p className="text-sm leading-[1.4] text-[#3A2A1F]">
          Check <span className="font-semibold">{email}</span> for a link to continue — it&apos;ll sign you
          straight in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2 rounded-full border border-[#E7D9CD] bg-white px-5 py-2 shadow-[0_4px_0_rgba(58,42,31,0.05)]">
        <Mail className="h-5 w-5 shrink-0 text-[#9E8B7E]" aria-hidden="true" />
        {lockedEmail ? (
          <span className="flex-1 truncate py-2 text-[16px] text-[#3A2A1F]">{lockedEmail}</span>
        ) : (
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
            className="flex-1 bg-transparent py-2 text-[16px] text-[#3A2A1F] outline-none placeholder:text-[#9E8B7E]"
          />
        )}
      </div>

      {helperText && <p className="px-1 text-[13px] leading-[1.3] text-[#6F5B4B]">{helperText}</p>}
      {error && <p className="px-1 text-[13px] leading-[1.3] text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={status === "sending" || !isValidEmail}
        className="splash-button h-16 w-full rounded-full bg-[#7CB342] text-[20px] font-semibold text-white shadow-[0_4px_0_rgba(58,42,31,0.08)] transition-colors active:bg-[#558B2F] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sending" ? "Sending..." : "Continue with email"}
      </button>

      {process.env.NODE_ENV === "development" && DEV_EMAIL && DEV_PASSWORD && (
        <button
          type="button"
          onClick={handleDevBypass}
          disabled={status === "sending"}
          className="mt-1 w-full rounded-full border border-dashed border-orange-400 py-2 text-sm text-orange-500 hover:bg-orange-50 disabled:opacity-60"
        >
          [dev] sign in as {DEV_EMAIL}
        </button>
      )}
    </form>
  );
}
