"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth-context";

function NameSetupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !user?.id) return;
    setSaving(true);
    await supabase.from("users").update({ name: trimmed }).eq("id", user.id);
    router.replace(next);
  }

  function handleSkip() {
    router.replace(next);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-white px-5">
      <a href="/" className="mb-10 text-[26px] font-bold tracking-tight text-[#1A1A1A]">
        num<span className="text-[#22C55E]">nums</span>
      </a>

      <div className="flex w-full max-w-[340px] flex-col">
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
          What&apos;s your name?
        </h1>
        <p className="mt-2 text-[15px] text-[#6B7280]">
          Your family will see this next to your meals.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
          <input
            type="text"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First name"
            autoComplete="given-name"
            className="rounded-xl border-2 border-[#E5E7EB] bg-white px-4 py-3 text-[16px] text-[#1A1A1A] outline-none transition-colors focus:border-[#35B36A] placeholder:text-[#9CA3AF]"
          />
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="h-12 w-full rounded-xl bg-[#35B36A] text-[16px] font-semibold text-white transition-colors hover:bg-[#16A34A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Continue"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleSkip}
          className="mt-4 text-center text-[14px] text-[#6B7280] hover:text-[#1A1A1A]"
        >
          Skip for now
        </button>
      </div>
    </main>
  );
}

export default function NameSetupPage() {
  return (
    <Suspense>
      <NameSetupInner />
    </Suspense>
  );
}
