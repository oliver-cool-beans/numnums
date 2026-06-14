"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronDown, Star, Check } from "lucide-react";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { NumnumsBackground } from "@/components/ui/NumnumsBackground";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useAuth } from "@/lib/auth-context";

const TYPEWRITER_TIMINGS_JSON = {
  typingBaseMs: 54,
  typingJitterMs: 18,
  phraseCycleMs: 15000,
  phraseEndMinPauseMs: 850,
  highlightFlashMs: 420,
  afterClearPauseMs: 230,
  punctuationPauseMs: {
    ".": 320,
    "?": 380,
    "!": 320,
    ",": 150,
  },
  emotionalWordPauseMs: {
    week: 220,
    know: 150,
    not: 130,
    planning: 240,
    hungry: 320,
    cancelled: 260,
    vibes: 190,
    fridge: 220,
    nothing: 250,
    yourself: 220,
  },
} as const;

const TYPEWRITER_TITLES = [
  "Let's sort your dinners this week",
  "Did your mum send you here?",
  "dinner's not gonna pick itself.",
  "surviving on vibes again?",
  "dinner decisions are cancelled.",
  "your future self is hungry.",
  "feeding yourself is back.",
  "eat something...",
] as const;

const punctuationPauses = TYPEWRITER_TIMINGS_JSON.punctuationPauseMs;
const emotionalWordPauses = TYPEWRITER_TIMINGS_JSON.emotionalWordPauseMs;

function randomJitter(max: number): number {
  return Math.floor(Math.random() * (max + 1));
}

function getTypingEmotionPause(text: string): number {
  const lastChar = text.slice(-1);
  const punctuationPause = punctuationPauses[lastChar as keyof typeof punctuationPauses] ?? 0;
  const words = text.toLowerCase().split(/\s+/);
  const lastWord = words[words.length - 1]?.replace(/[^a-z]/g, "");
  if (!lastWord) return punctuationPause;
  return punctuationPause + (emotionalWordPauses[lastWord as keyof typeof emotionalWordPauses] ?? 0);
}

const STATS = [
  { value: "< 10 min", label: "to plan your week" },
  { value: "7 dinners", label: "sorted at once" },
  { value: "1 list", label: "for the whole shop" },
];

const RECIPE_PREVIEWS = [
  { name: "Honey Garlic Salmon", time: "25 min", tag: "Quick", fromColor: "#FFB88C", toColor: "#FF9060", emoji: "🐟" },
  { name: "Crispy Tofu Stir-fry", time: "30 min", tag: "Veggie", fromColor: "#C2EAC9", toColor: "#7DC48A", emoji: "🥢" },
  { name: "Spaghetti Bolognese", time: "40 min", tag: "Classic", fromColor: "#FFE7A3", toColor: "#F0C840", emoji: "🍝" },
  { name: "Chicken Tikka Masala", time: "45 min", tag: "Spicy", fromColor: "#FFCBA0", toColor: "#E89050", emoji: "🍛" },
  { name: "Greek Lamb Meatballs", time: "35 min", tag: "Med", fromColor: "#D8EEFF", toColor: "#90BEE8", emoji: "🫙" },
  { name: "Black Bean Tacos", time: "20 min", tag: "Vegan", fromColor: "#DFFFCE", toColor: "#90D878", emoji: "🌮" },
];

const FEATURES = [
  {
    bg: "#FFF0EE",
    icon: "❤️",
    label: "Remembers your tastes",
    description: "Set your household's preferences once. numnums never suggests what you've told it to avoid.",
  },
  {
    bg: "#EBF6DC",
    icon: "🔄",
    label: "Easy to swap",
    description: "Not feeling Tuesday's dinner? Swap it in a tap. Your shopping list updates instantly.",
  },
  {
    bg: "#E6F4FA",
    icon: "👨‍👩‍👧",
    label: "Built for families",
    description: "Invite your partner or housemates. Everyone sees the same plan — nobody's out of the loop.",
  },
  {
    bg: "#FFF3E6",
    icon: "🛒",
    label: "Smart shopping list",
    description: "Ingredients from every dinner, combined into one list. One trip, nothing forgotten.",
  },
];

const TESTIMONIALS = [
  {
    quote: "Ever since I started using numnums, I don't feel as dead inside.",
    name: "Sarah",
    initial: "S",
    color: "#5FA66B",
  },
  {
    quote: "My wife and I finally agree on meals. Now we don't need to get a divorce",
    name: "Marcus",
    initial: "M",
    color: "#E58A45",
  },
  {
    quote: "The shopping list alone saves me 20 minutes every week. Worth it just for that.",
    name: "Priya",
    initial: "P",
    color: "#58A6D6",
  },
];

export default function Home() {
  const [headline, setHeadline] = useState<string>(TYPEWRITER_TITLES[0]);
  const [titleIndex, setTitleIndex] = useState(0);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const phraseStartRef = useRef<number>(0);
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    console.info("[customer-home] Auth state observed on home page", {
      hasUser: Boolean(user),
      userId: user?.id ?? null,
      pathname: globalThis.window?.location.pathname ?? null,
    });
    if (user) {
      console.info("[customer-home] Redirecting authenticated user to dashboard", { userId: user.id });
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  useEffect(() => {
    phraseStartRef.current = Date.now();
  }, []);

  useEffect(() => {
    const currentTitle = TYPEWRITER_TITLES[titleIndex];
    const isAtFullTitle = headline === currentTitle;
    const isAtEmpty = headline.length === 0;
    const isFirstTitle = titleIndex === 0;

    let nextDelay: number = TYPEWRITER_TIMINGS_JSON.typingBaseMs;
    let action: () => void = () => {};

    if (isFirstTitle && !isHighlighting && headline === currentTitle) {
      const elapsed = Date.now() - phraseStartRef.current;
      nextDelay = Math.max(
        TYPEWRITER_TIMINGS_JSON.phraseEndMinPauseMs,
        TYPEWRITER_TIMINGS_JSON.phraseCycleMs - elapsed,
      );
      action = () => setIsHighlighting(true);
    } else if (!isHighlighting && !isAtFullTitle) {
      const nextText = currentTitle.slice(0, headline.length + 1);
      nextDelay =
        TYPEWRITER_TIMINGS_JSON.typingBaseMs +
        randomJitter(TYPEWRITER_TIMINGS_JSON.typingJitterMs) +
        getTypingEmotionPause(nextText);
      action = () => setHeadline(nextText);
    } else if (!isHighlighting && isAtFullTitle && !isFirstTitle) {
      const elapsed = Date.now() - phraseStartRef.current;
      nextDelay = Math.max(
        TYPEWRITER_TIMINGS_JSON.phraseEndMinPauseMs,
        TYPEWRITER_TIMINGS_JSON.phraseCycleMs - elapsed,
      );
      action = () => setIsHighlighting(true);
    } else if (isHighlighting && !isAtEmpty) {
      nextDelay = TYPEWRITER_TIMINGS_JSON.highlightFlashMs;
      action = () => {
        setHeadline("");
        setIsHighlighting(false);
        setTitleIndex((prev) => (prev + 1) % TYPEWRITER_TITLES.length);
        phraseStartRef.current = Date.now() + TYPEWRITER_TIMINGS_JSON.afterClearPauseMs;
      };
    } else {
      nextDelay = TYPEWRITER_TIMINGS_JSON.afterClearPauseMs;
      action = () => {
        phraseStartRef.current = Date.now();
      };
    }

    const timeout = window.setTimeout(action, nextDelay);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [headline, isHighlighting, titleIndex]);

  if (loading || user) {
    return <LoadingScreen />;
  }

  const firstWord = headline.split(" ")[0] ?? "";
  const restOfHeadline = headline.slice(firstWord.length).trimStart();

  return (
    <main className="text-[#3A2A1F]">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-dvh w-full overflow-hidden bg-white">
        <NumnumsBackground animated />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              "radial-gradient(ellipse 85% 65% at 50% 40%, transparent 30%, rgba(255,235,200,0.28) 100%)",
          }}
        />

        <div className="relative z-10 flex min-h-dvh flex-col items-center px-5 pb-24 pt-6 md:px-10 lg:flex-row lg:items-center lg:justify-center lg:gap-16 lg:px-12 lg:pb-12 lg:pt-10 xl:gap-24">

          {/* Content column */}
          <div className="flex w-full flex-col items-center lg:w-[460px] lg:shrink-0 lg:items-start">
            <header className="w-full">
              <p className="text-left text-[min(52px,8svh)] font-semibold leading-none tracking-[-0.03em] md:text-[64px]">
                <span className="text-[#3A2A1F]">num</span>
                <span className="text-[#5FA66B]">nums</span>
              </p>
            </header>

            {/* Pot — mobile only */}
            <div className="relative mt-5 h-[min(170px,19svh)] w-[min(170px,19svh)] splash-pot lg:hidden">
              <div className="absolute -inset-6 rounded-full bg-[#FFE7A3]/60 blur-3xl" aria-hidden="true" />
              <Image
                src="/pot.png"
                alt="Numnums cooking pot mascot"
                fill
                priority
                sizes="180px"
                className="object-contain"
              />
              <span className="splash-veg-1 absolute left-4 top-[58px] h-7 w-7 rounded-full bg-[#58A6D6]" />
              <span className="splash-veg-2 absolute right-5 top-[74px] h-6 w-6 rounded-full bg-[#E58A45]" />
            </div>

            {/* Typewriter headline */}
            <p className="splash-headline mt-4 min-h-[1.9em] text-center text-[min(56px,7.8svh)] font-[600] leading-[0.9] tracking-[-0.04em] lg:mt-6 lg:text-left xl:text-[84px]">
              <span
                className={`inline-block rounded-sm px-1 py-0.5 transition-all duration-300 ${
                  isHighlighting ? "typewriter-text-highlight" : ""
                }`}
              >
                <span className="text-[#5FA66B]">{firstWord}</span>
                {restOfHeadline ? ` ${restOfHeadline}` : ""}
                <span className="typewriter-cursor" aria-hidden="true">
                  |
                </span>
              </span>
            </p>

            {/* Tagline */}
            <p className="mt-3 max-w-[300px] text-center text-[min(22px,3.2svh)] font-medium leading-[1.25] tracking-[-0.01em] text-[#6F5B4B] md:max-w-[440px] md:text-[24px] lg:text-left lg:max-w-none">
              tell us what you like and we&apos;ll sort your dinners.
            </p>

            {/* Sign-in form */}
            <div className="mt-7 w-full max-w-[360px] lg:mt-8 lg:max-w-[340px]">
              <MagicLinkForm redirectPath="/auth/complete?next=/dashboard" />
              <p className="mt-2.5 text-center text-[13px] text-[#9E8B7E] lg:text-left">
                Free · No password · No credit card
              </p>
            </div>
          </div>

          {/* Pot — desktop only */}
          <div className="hidden lg:flex lg:w-[420px] lg:shrink-0 lg:items-center lg:justify-start xl:w-[480px]">
            <div className="relative h-[420px] w-[420px] splash-pot xl:h-[480px] xl:w-[480px]">
              <div className="absolute -inset-10 rounded-full bg-[#FFE7A3]/50 blur-3xl" aria-hidden="true" />
              <Image
                src="/pot.png"
                alt="Numnums cooking pot mascot"
                fill
                priority
                sizes="(max-width: 1280px) 420px, 480px"
                className="object-contain"
              />
              <span className="splash-veg-1 absolute left-4 top-[72px] h-7 w-7 rounded-full bg-[#58A6D6]" />
              <span className="splash-veg-2 absolute right-5 top-[92px] h-6 w-6 rounded-full bg-[#E58A45]" />
            </div>
          </div>
        </div>

        {/* Scroll nudge */}
        <a
          href="#how-it-works"
          aria-label="Scroll to learn more"
          className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 flex flex-col items-center gap-1 text-[#9E8B7E] opacity-60 transition-opacity hover:opacity-100"
        >
          <span className="text-[13px] font-medium">see how it works</span>
          <ChevronDown className="h-5 w-5 motion-safe:animate-bounce" />
        </a>
      </section>

      {/* ── STATS STRIP ─────────────────────────────────────────── */}
      <section className="border-y border-[#eadfce] bg-[#fff7e8]">
        <div className="mx-auto flex max-w-3xl divide-x divide-[#eadfce]">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-1 flex-col items-center px-4 py-8 text-center"
            >
              <p className="text-[26px] font-semibold leading-none tracking-tight md:text-[32px]">
                {stat.value}
              </p>
              <p className="mt-1.5 text-[13px] font-medium text-[#9E8B7E] md:text-[14px]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-white px-5 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9E8B7E]">
            how it works
          </p>
          <h2 className="mt-3 text-center text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[38px]">
            Sorted in three steps.
          </h2>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">

            {/* Step 1 — preferences */}
            <div className="flex flex-col gap-5">
              <div className="flex h-44 items-center justify-center rounded-[20px] bg-[#fff7e8] p-5">
                <div className="flex flex-wrap justify-center gap-2">
                  {["🍜 Asian", "🌶 Spicy", "🥗 Veggie", "🐟 Fish", "🍕 Italian", "🌯 Quick"].map((p) => (
                    <span
                      key={p}
                      className="rounded-full border border-[#eadfce] bg-white px-3 py-1.5 text-[13px] font-medium text-[#3A2A1F] shadow-[0_2px_0_rgba(58,42,31,0.06)]"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFE7A3] text-[14px] font-bold shadow-[0_2px_0_rgba(58,42,31,0.08)]">
                  1
                </span>
                <div>
                  <p className="text-[17px] font-semibold leading-tight">Set your tastes</p>
                  <p className="mt-1.5 text-[14px] leading-[1.55] text-[#6F5B4B]">
                    Tell numnums what your household loves, hates, and everything in between. Done in two minutes.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 — week plan */}
            <div className="flex flex-col gap-5">
              <div className="flex h-44 items-center justify-center rounded-[20px] bg-[#fff7e8] p-5">
                <div className="flex w-full max-w-[210px] flex-col gap-1.5">
                  {[
                    { day: "Mon", name: "Salmon & Greens", color: "#FFB88C" },
                    { day: "Tue", name: "Tofu Stir-fry", color: "#BDE8C9" },
                    { day: "Wed", name: "Pasta Bake", color: "#FFE7A3" },
                    { day: "Thu", name: "Chicken Tikka", color: "#FFCBA0" },
                  ].map((r) => (
                    <div
                      key={r.day}
                      className="flex items-center gap-2 rounded-full px-3 py-1.5"
                      style={{ background: r.color + "60" }}
                    >
                      <span className="w-7 shrink-0 text-[11px] font-bold text-[#6F5B4B]">{r.day}</span>
                      <span className="truncate text-[12px] font-medium text-[#3A2A1F]">{r.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFE7A3] text-[14px] font-bold shadow-[0_2px_0_rgba(58,42,31,0.08)]">
                  2
                </span>
                <div>
                  <p className="text-[17px] font-semibold leading-tight">Get your week planned</p>
                  <p className="mt-1.5 text-[14px] leading-[1.55] text-[#6F5B4B]">
                    numnums picks dinners that fit. Swap anything you don&apos;t fancy with a tap.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 — shopping list */}
            <div className="flex flex-col gap-5">
              <div className="flex h-44 items-center justify-center rounded-[20px] bg-[#fff7e8] p-5">
                <div className="flex w-full max-w-[180px] flex-col gap-2.5">
                  {[
                    { item: "Salmon fillet", done: true },
                    { item: "Garlic cloves", done: true },
                    { item: "Broccoli", done: true },
                    { item: "Soy sauce", done: false },
                    { item: "Brown rice", done: false },
                  ].map(({ item, done }) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-[1.5px] ${
                          done ? "border-[#5FA66B] bg-[#EBF6DC]" : "border-[#D4C5B5]"
                        }`}
                      >
                        {done && <Check className="h-3 w-3 text-[#5FA66B]" strokeWidth={3} />}
                      </div>
                      <span
                        className={`text-[13px] font-medium ${done ? "text-[#9E8B7E] line-through" : "text-[#3A2A1F]"}`}
                      >
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFE7A3] text-[14px] font-bold shadow-[0_2px_0_rgba(58,42,31,0.08)]">
                  3
                </span>
                <div>
                  <p className="text-[17px] font-semibold leading-tight">Shop once, cook all week</p>
                  <p className="mt-1.5 text-[14px] leading-[1.55] text-[#6F5B4B]">
                    Your shopping list builds itself from the week&apos;s meals. One trip. Nothing missing.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── RECIPE PREVIEW ───────────────────────────────────────── */}
      <section className="border-t border-[#eadfce] bg-[#fff7e8] px-5 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9E8B7E]">
            what&apos;s on the menu
          </p>
          <h2 className="mt-3 text-center text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[38px]">
            Hundreds of recipes. Always fresh.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-[16px] font-medium leading-[1.4] text-[#6F5B4B]">
            Quick weeknights, lazy Sundays, family favourites — something for every night of the week.
          </p>

          {/* Horizontal scroll on mobile, grid on md+ */}
          <div className="-mx-5 mt-8 flex gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
            {RECIPE_PREVIEWS.map((r) => (
              <div
                key={r.name}
                className="flex w-[190px] shrink-0 flex-col overflow-hidden rounded-[20px] border border-[#eadfce] bg-white shadow-[0_4px_0_rgba(58,42,31,0.06)] md:w-auto"
              >
                <div
                  className="flex h-32 items-center justify-center text-[46px]"
                  style={{
                    background: `linear-gradient(135deg, ${r.fromColor}, ${r.toColor})`,
                  }}
                >
                  {r.emoji}
                </div>
                <div className="flex flex-col gap-1.5 p-4">
                  <span className="w-fit rounded-full bg-[#EBF6DC] px-2.5 py-0.5 text-[11px] font-semibold text-[#5FA66B]">
                    {r.tag}
                  </span>
                  <p className="text-[14px] font-semibold leading-tight text-[#3A2A1F]">{r.name}</p>
                  <p className="text-[12px] font-medium text-[#9E8B7E]">⏱ {r.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section className="border-t border-[#eadfce] bg-white px-5 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9E8B7E]">
            why numnums
          </p>
          <h2 className="mt-3 text-center text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[38px]">
            Dinner, your way.
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.label}
                className="rounded-[20px] border border-[#eadfce] bg-[#fffaf1] p-6 shadow-[0_4px_0_rgba(58,42,31,0.06)]"
              >
                <div
                  className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full text-[20px]"
                  style={{ background: f.bg }}
                >
                  {f.icon}
                </div>
                <p className="text-[17px] font-semibold leading-[1.2]">{f.label}</p>
                <p className="mt-2 text-[14px] leading-[1.55] text-[#6F5B4B]">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────── */}
      <section className="border-t border-[#eadfce] bg-[#fff7e8] px-5 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9E8B7E]">
            what people say
          </p>
          <h2 className="mt-3 text-center text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[38px]">
            Finally. Dinner sorted.
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="flex flex-col gap-4 rounded-[20px] border border-[#eadfce] bg-white p-6 shadow-[0_4px_0_rgba(58,42,31,0.06)]"
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#FFE7A3] text-[#F0C840]" />
                  ))}
                </div>
                <p className="flex-1 text-[15px] leading-[1.6] text-[#3A2A1F]">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold text-white"
                    style={{ background: t.color }}
                  >
                    {t.initial}
                  </div>
                  <span className="text-[14px] font-semibold text-[#3A2A1F]">{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA (dark) ─────────────────────────────────────── */}
      <section id="get-started" className="bg-[#3A2A1F] px-5 py-20 md:py-28">
        <div className="mx-auto max-w-sm text-center">
          <div className="relative mx-auto mb-6 h-20 w-20 greeting-pot">
            <Image src="/pot.png" alt="" fill aria-hidden="true" className="object-contain" />
          </div>
          <h2 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] text-white md:text-[38px]">
            Stop guessing.<br />Start eating.
          </h2>
          <p className="mt-3 text-[16px] font-medium leading-[1.4] text-[#BFB0A4]">
            Sign in with your email — no password needed. Free to use.
          </p>
          <div className="mt-8">
            <MagicLinkForm redirectPath="/auth/complete?next=/dashboard" />
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="bg-[#2D2118] px-5 py-6">
        <p className="text-center text-[13px] text-[#6A5A52]">
          <span className="font-semibold text-white">num</span>
          <span className="font-semibold text-[#5FA66B]">nums</span>
          {" · © "}
          {new Date().getFullYear()}
          {" · Your week, sorted."}
        </p>
      </footer>

    </main>
  );
}
