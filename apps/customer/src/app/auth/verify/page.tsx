"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { toast } from "@/lib/toast";

const DIGIT_COUNT = 6;
const DIGIT_KEYS = ["d0", "d1", "d2", "d3", "d4", "d5"] as const;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Email step ───────────────────────────────────────────────────────────────

function EmailStep({ onSent }: { onSent: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const isValid = EMAIL_PATTERN.test(email.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || sending) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    if (error) {
      toast.error(error.message || "Could not send the code. Try again in a moment.");
      setSending(false);
      return;
    }
    onSent(email.trim());
  }

  return (
    <div className="flex w-full max-w-[340px] flex-col">
      <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[#1A1A1A]">Sign in</h1>
      <p className="mt-2 text-[15px] text-[#6B7280]">
        Enter your email and we&apos;ll send you a login code.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
        <div className="flex items-center gap-2.5 rounded-xl border-2 border-[#E5E7EB] bg-white px-4 py-3 transition-colors focus-within:border-[#35B36A]">
          <Mail className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
          <input
            type="email"
            required
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
            className="flex-1 bg-transparent text-[16px] text-[#1A1A1A] outline-none placeholder:text-[#9CA3AF]"
          />
        </div>
        <button
          type="submit"
          disabled={!isValid || sending}
          className="h-12 w-full rounded-xl bg-[#35B36A] text-[16px] font-semibold text-white transition-colors hover:bg-[#16A34A] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Sending…" : "Continue"}
        </button>
      </form>

      <p className="mt-4 text-center text-[13px] text-[#6B7280]">No password needed</p>
    </div>
  );
}

// ── Code step ────────────────────────────────────────────────────────────────

function CodeStep({ email, next }: { email: string; next: string }) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(""));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const verify = useCallback(async (code: string) => {
    if (verifying) return;
    setVerifying(true);
    setError(null);
    const { error: otpError } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    if (otpError) {
      setError("That code didn't work — check your email and try again.");
      setDigits(Array(DIGIT_COUNT).fill(""));
      setVerifying(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 0);
      return;
    }
    router.push(next);
  }, [email, next, router, verifying]);

  function focusNext(index: number) { inputRefs.current[Math.min(index + 1, DIGIT_COUNT - 1)]?.focus(); }
  function focusPrev(index: number) { inputRefs.current[Math.max(index - 1, 0)]?.focus(); }

  function fillDigits(chars: string, startIndex = 0) {
    const newDigits = [...digits];
    chars.split("").forEach((ch, i) => {
      const pos = startIndex + i;
      if (pos < DIGIT_COUNT) newDigits[pos] = ch;
    });
    setDigits(newDigits);
    inputRefs.current[Math.min(startIndex + chars.length, DIGIT_COUNT - 1)]?.focus();
    if (newDigits.every(d => d !== "")) void verify(newDigits.join(""));
  }

  function handleChange(index: number, value: string) {
    setError(null);
    const clean = value.replace(/\D/g, "");
    if (!clean) return;
    if (clean.length > 1) { fillDigits(clean.slice(0, DIGIT_COUNT), 0); return; }
    const newDigits = [...digits];
    newDigits[index] = clean;
    setDigits(newDigits);
    focusNext(index);
    if (newDigits.every(d => d !== "")) void verify(newDigits.join(""));
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      setError(null);
      if (digits[index]) {
        const newDigits = [...digits];
        newDigits[index] = "";
        setDigits(newDigits);
      } else {
        const newDigits = [...digits];
        newDigits[Math.max(index - 1, 0)] = "";
        setDigits(newDigits);
        focusPrev(index);
      }
    } else if (e.key === "ArrowLeft") { e.preventDefault(); focusPrev(index); }
    else if (e.key === "ArrowRight") { e.preventDefault(); focusNext(index); }
  }

  function handlePaste(e: React.ClipboardEvent, index: number) {
    e.preventDefault();
    const clean = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGIT_COUNT);
    if (clean) fillDigits(clean, index);
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    const { error: resendError } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setResending(false);
    if (resendError) {
      toast.error("Could not resend — try again in a moment.");
    } else {
      toast.success("New code sent");
      setDigits(Array(DIGIT_COUNT).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 0);
    }
  }

  const disabled = verifying || resending;

  return (
    <div className="flex w-full max-w-[340px] flex-col items-center text-center">
      <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
        Check your email
      </h1>
      <p className="mt-2 text-[15px] text-[#6B7280]">
        We sent a 6-digit code to{" "}
        <span className="font-semibold text-[#1A1A1A]">{email}</span>
      </p>

      {/* OTP inputs */}
      <div className="mt-8 flex w-full justify-center gap-2" role="group" aria-label="One-time passcode">
        {DIGIT_KEYS.map((key, i) => {
          const borderClass = error
            ? "border-red-400"
            : digits[i]
              ? "border-[#22C55E] shadow-[0_0_0_3px_rgba(61,143,88,0.15)]"
              : "border-[#E2EDE5]";
          const focusClass = error
            ? "focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]"
            : "focus:border-[#22C55E] focus:shadow-[0_0_0_3px_rgba(61,143,88,0.15)]";

          return (
            <input
              key={key}
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              value={digits[i]}
              autoComplete="one-time-code"
              aria-label={`Digit ${i + 1}`}
              disabled={disabled}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus={i === 0}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={e => handlePaste(e, i)}
              onFocus={e => e.currentTarget.select()}
              className={`h-[56px] w-full min-w-0 rounded-xl border-2 bg-white text-center text-[22px] font-bold text-[#1A1A1A] outline-none transition-all duration-100 disabled:opacity-40 ${borderClass} ${focusClass}`}
            />
          );
        })}
      </div>

      <p
        className={[
          "mt-3 text-[14px] font-medium text-red-500 transition-all duration-200",
          error ? "opacity-100" : "pointer-events-none select-none opacity-0",
        ].join(" ")}
        aria-live="polite"
      >
        {error ?? " "}
      </p>

      {verifying && <p className="mt-1 text-[14px] text-[#6B7280]">Verifying…</p>}

      <div className="mt-6 flex flex-col items-center gap-2 text-[14px] text-[#6B7280]">
        <button
          type="button"
          onClick={handleResend}
          disabled={disabled}
          className="hover:text-[#1A1A1A] disabled:opacity-40"
        >
          {resending ? "Sending…" : "Didn't get a code? Resend"}
        </button>
        <a href="/" className="hover:text-[#1A1A1A]">
          Wrong email? Start over
        </a>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

function LoginInner() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const next = searchParams.get("next") || "/dashboard";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-white px-5">
      <a href="/" className="mb-10 text-[26px] font-bold tracking-tight text-[#1A1A1A]">
        num<span className="text-[#22C55E]">nums</span>
      </a>

      {email
        ? <CodeStep email={email} next={next} />
        : <EmailStep onSent={setEmail} />
      }
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
