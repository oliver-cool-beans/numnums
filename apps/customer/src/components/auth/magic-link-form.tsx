"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL;
const DEV_PASSWORD = process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function sendCode(emailAddress: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithOtp({
    email: emailAddress,
    options: { shouldCreateUser: true },
  });

  if (error) {
    console.error("[otp] Failed to send code", { message: error.message, status: error.status, code: (error as { code?: string }).code });
    toast.error(error.message || "Could not send the code. Try again in a moment.");
    return false;
  }

  return true;
}

type MagicLinkFormProps = {
  destination: string;
  lockedEmail?: string;
  helperText?: string;
  className?: string;
};

export function MagicLinkForm({ destination, lockedEmail, helperText, className }: MagicLinkFormProps) {
  const [email, setEmail] = useState(lockedEmail ?? "");
  const [sending, setSending] = useState(false);
  const router = useRouter();

  const isValidEmail = EMAIL_PATTERN.test(email.trim());

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!isValidEmail || sending) return;

    setSending(true);
    const ok = await sendCode(trimmed);

    if (ok) {
      router.push(
        `/auth/verify?email=${encodeURIComponent(trimmed)}&next=${encodeURIComponent(destination)}`
      );
    } else {
      setSending(false);
    }
  }

  async function handleDevBypass() {
    if (!DEV_EMAIL || !DEV_PASSWORD) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithPassword({ email: DEV_EMAIL, password: DEV_PASSWORD });
    if (error) {
      toast.error(error.message);
      setSending(false);
      return;
    }
    router.push(destination);
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2 rounded-full border border-[#E7D9CD] bg-white px-5 py-2 shadow-[0_4px_0_rgba(58,42,31,0.05)] transition-[box-shadow,border-color] duration-200 focus-within:border-[#7CB342]/50 focus-within:shadow-[0_4px_0_rgba(58,42,31,0.05),0_0_0_3px_rgba(124,179,66,0.15)]">
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

      <button
        type="submit"
        disabled={sending || !isValidEmail}
        className="splash-button h-16 w-full rounded-full bg-gradient-to-b from-[#87C44E] to-[#6BA030] text-[20px] font-semibold text-white shadow-[0_4px_0_rgba(58,42,31,0.12),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-150 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(58,42,31,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? "Sending..." : "Continue with email"}
      </button>

      {process.env.NODE_ENV === "development" && DEV_EMAIL && DEV_PASSWORD && (
        <button
          type="button"
          onClick={handleDevBypass}
          disabled={sending}
          className="mt-1 w-full rounded-full border border-dashed border-orange-400 py-2 text-sm text-orange-500 hover:bg-orange-50 disabled:opacity-60"
        >
          [dev] sign in as {DEV_EMAIL}
        </button>
      )}
    </form>
  );
}
