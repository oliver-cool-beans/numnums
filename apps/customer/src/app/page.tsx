"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { NumnumsBackground } from "@/components/ui/NumnumsBackground";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { RecipeShowcase } from "@/components/home/RecipeShowcase";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

const TESTIMONIALS = [
  {
    quote: "Ever since I started using numnums, I don't feel as dead inside.",
    name: "Sarah",
    initial: "S",
  },
  {
    quote: "My wife and I finally agree on meals. Now we don't need to get a divorce.",
    name: "Marcus",
    initial: "M",
  },
  {
    quote: "The shopping list alone saves me 20 minutes every week. Worth it just for that.",
    name: "Priya",
    initial: "P",
  },
];

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  if (loading || user) return <LoadingScreen />;

  return (
    <div className="text-[#18181B]">

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#FFFBF0]">
        <div className="mx-auto flex h-12 max-w-none items-center justify-between px-4 lg:px-16">
          <span className="text-[32px] font-bold tracking-tight text-[#18181B] md:text-[42px]">
            num<span className="text-[#22C55E]">nums</span>
          </span>
          <div className="flex items-center gap-3">
            <a
              href="/auth/verify"
              className="hidden text-[13px] font-medium text-[#71717A] transition-colors hover:text-[#18181B] sm:block"
            >
              Log in
            </a>
            <a
              href="/auth/verify"
              className="rounded-full bg-[#22C55E] px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#16A34A]"
            >
              Get started
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#FFFBF0] px-4 py-8 lg:px-16 lg:py-14">
        <NumnumsBackground animated />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#22C55E] md:text-[11px]">
              You don&apos;t need a meal plan...
            </p>
            <h1
              className="font-bold leading-[0.95] tracking-[-0.04em] text-[#18181B]"
              style={{ fontSize: "clamp(38px, 8vw, 80px)" }}
            >
              Dinner, <span className="text-[#22C55E]">Sorted.</span>
            </h1>
            <p className="mt-3 max-w-sm text-[16px] leading-[1.5] text-[#71717A] md:text-[20px]">
              like a meal plan, but nothing is shipped and you go get it yourself.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
              <a
                href="/auth/verify"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#22C55E] px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#16A34A]"
              >
                ok, sort me out <span aria-hidden="true">→</span>
              </a>
              <p className="text-center text-[12px] text-[#A1A1AA] sm:text-left">free · 2 mins · no excuses</p>
            </div>
          </div>
          <Image
            src="/pot-angle.png"
            alt=""
            width={180}
            height={180}
            className="shrink-0 mix-blend-multiply w-[120px] md:w-[180px]"
            priority
          />
        </div>
      </section>

      {/* ── RECIPES ──────────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="px-4 py-8 lg:px-10">
          <RecipeShowcase />
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────── */}
      <section className="bg-[#FEFCE8]">
        <div className="px-4 py-10 md:mx-auto md:max-w-5xl md:px-5 md:py-24">
          <h2 className="mb-6 text-[24px] font-bold tracking-[-0.03em] md:mb-12 md:text-center md:text-[42px]">
            Finally. Dinner sorted.
          </h2>
          {/* Horizontal scroll on mobile, grid on desktop */}
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="w-[80vw] shrink-0 rounded-2xl border border-[#E4E4E7] bg-white p-5 md:w-auto">
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={`star-${i}`} className="text-[15px] text-[#FBBF24]">★</span>
                  ))}
                </div>
                <p className="mb-4 text-[14px] leading-[1.6] text-[#18181B]">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22C55E] text-[12px] font-bold text-white">
                    {t.initial}
                  </div>
                  <span className="text-[13px] font-semibold text-[#18181B]">{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#FEFCE8]">
        <NumnumsBackground animated />
        <div className="relative z-10 mx-auto max-w-lg px-4 py-14 text-center md:py-28">
          <h2 className="mb-3 text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-[#18181B] md:text-[48px]">
            Stop guessing.<br />Start eating.
          </h2>
          <p className="mb-6 text-[15px] text-[#71717A]">
            Free to use. No password. Takes 2 minutes.
          </p>
          <MagicLinkForm destination="/dashboard" />
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="bg-[#FFFBF0] px-4 py-5">
        <p className="text-center text-[12px] text-[#A1A1AA]">
          <span className="font-bold text-[#18181B]">num</span>
          <span className="font-bold text-[#22C55E]">nums</span>
          {" · © "}
          {new Date().getFullYear()}
          {" · Your week, sorted."}
        </p>
      </footer>

    </div>
  );
}
