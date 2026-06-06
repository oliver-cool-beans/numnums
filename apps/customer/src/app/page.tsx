"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { SiMeta } from "react-icons/si";
import { SocialLoginButton } from "@/components/auth/social-login-button";
import { NumnumsBackground } from "@/components/ui/NumnumsBackground";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase-client";

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

  if (!lastWord) {
    return punctuationPause;
  }

  return punctuationPause + (emotionalWordPauses[lastWord as keyof typeof emotionalWordPauses] ?? 0);
}

export default function Home() {
  const [headline, setHeadline] = useState<string>(TYPEWRITER_TITLES[0]);
  const [titleIndex, setTitleIndex] = useState(0);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const phraseStartRef = useRef<number>(0);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    console.info("[customer-home] Auth state observed on home page", {
      hasUser: Boolean(user),
      userId: user?.id ?? null,
      pathname: globalThis.window?.location.pathname ?? null,
    });

    if (user) {
      console.info("[customer-home] Redirecting authenticated user to dashboard", {
        userId: user.id,
      });
      router.replace("/dashboard");
    }
  }, [user, router]);

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
      // First title is displayed, wait for highlight
      const elapsed = Date.now() - phraseStartRef.current;
      nextDelay = Math.max(
        TYPEWRITER_TIMINGS_JSON.phraseEndMinPauseMs,
        TYPEWRITER_TIMINGS_JSON.phraseCycleMs - elapsed,
      );
      action = () => setIsHighlighting(true);
    } else if (!isHighlighting && !isAtFullTitle) {
      // Typing mode for any title when not yet complete
      const nextText = currentTitle.slice(0, headline.length + 1);
      nextDelay =
        TYPEWRITER_TIMINGS_JSON.typingBaseMs +
        randomJitter(TYPEWRITER_TIMINGS_JSON.typingJitterMs) +
        getTypingEmotionPause(nextText);
      action = () => setHeadline(nextText);
    } else if (!isHighlighting && isAtFullTitle && !isFirstTitle) {
      // At full title (non-first), wait for highlight
      const elapsed = Date.now() - phraseStartRef.current;
      nextDelay = Math.max(
        TYPEWRITER_TIMINGS_JSON.phraseEndMinPauseMs,
        TYPEWRITER_TIMINGS_JSON.phraseCycleMs - elapsed,
      );
      action = () => setIsHighlighting(true);
    } else if (isHighlighting && !isAtEmpty) {
      // Highlighting
      nextDelay = TYPEWRITER_TIMINGS_JSON.highlightFlashMs;
      action = () => {
        setHeadline("");
        setIsHighlighting(false);
        setTitleIndex((prev) => (prev + 1) % TYPEWRITER_TITLES.length);
        phraseStartRef.current = Date.now() + TYPEWRITER_TIMINGS_JSON.afterClearPauseMs;
      };
    } else {
      // After clear pause
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

  const firstWord = headline.split(" ")[0] ?? "";
  const restOfHeadline = headline.slice(firstWord.length).trimStart();

  const handleLogin = async () => {
    const redirectUrl = new URL("/auth/complete", globalThis.window.location.origin);
    redirectUrl.searchParams.set("next", "/dashboard");

    console.info("[customer-home] Starting OAuth sign-in", {
      provider: "facebook",
      redirectTo: redirectUrl.toString(),
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: { redirectTo: redirectUrl.toString() },
    });

    if (error) {
      console.error("[customer-home] OAuth sign-in failed to start", error);
      return;
    }

    console.info("[customer-home] OAuth sign-in started", {
      provider: "facebook",
      authUrl: data.url ?? null,
    });
  };

  return (
    <main className="relative min-h-dvh w-full bg-white">
      <NumnumsBackground animated />
      {/*
        Breakpoints:
          < md  (< 768px)  — mobile: single col, fixed bottom button
          md–lg (768–1023) — tablet: single col centered, fixed bottom button
          lg+   (1024px+)  — desktop: two-col side by side, in-flow button
      */}
      <section className="relative z-10 flex min-h-dvh flex-col px-4 pb-[calc(5rem+max(1rem,env(safe-area-inset-bottom)))] pt-3 text-[#3A2A1F] md:px-10 md:pt-8 lg:flex-row lg:items-center lg:justify-center lg:gap-16 lg:overflow-visible lg:px-12 lg:pb-12 lg:pt-10 xl:gap-24">

        {/* Content column */}
        <div className="flex flex-1 flex-col md:mx-auto md:w-full md:max-w-[580px] lg:mx-0 lg:flex-none lg:w-[440px] lg:justify-center lg:py-8">
          <header className="w-full">
            <p className="text-left text-[52px] font-semibold leading-none tracking-[-0.03em] md:text-[64px]">numnums</p>
          </header>

          {/* Middle content */}
          <div className="mt-5 flex flex-1 flex-col items-center md:mt-8 lg:mt-10 lg:flex-none lg:items-start">

            {/* Pot image — mobile + tablet (hidden on desktop where it moves to the right column) */}
            <div className="relative h-[min(240px,30svh)] w-[min(240px,30svh)] splash-pot md:h-[300px] md:w-[300px] lg:hidden">
              <Image src="/pot.png" alt="Numnums cooking pot mascot" fill priority sizes="(max-width: 1024px) 300px, 240px" className="object-contain" />
              <span className="splash-veg-1 absolute left-4 top-[72px] h-7 w-7 rounded-full bg-[#58A6D6]" />
              <span className="splash-veg-2 absolute right-5 top-[92px] h-6 w-6 rounded-full bg-[#E58A45]" />
            </div>

            <p className="splash-headline mt-0 mb-0 min-h-[2.2em] max-w-[360px] pb-0 text-center text-[62px] font-[600] leading-[0.9] tracking-[-0.04em] md:min-h-0 md:max-w-[540px] md:text-[76px] lg:text-left xl:text-[88px]">
              <span
                className={`inline-block px-1 py-0.5 rounded-sm transition-all duration-300 ${
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

            <p className="mt-3 max-w-[340px] text-center text-[30px] font-medium leading-[1.15] tracking-[-0.01em] text-[#6F5B4B] md:max-w-[460px] md:text-[28px] lg:text-left lg:max-w-[400px] lg:text-[26px] xl:text-[30px]">
              tell us what you like and we&apos;ll sort your dinners.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[14px] font-semibold tracking-[0.01em] text-[#5A4535] lg:justify-start">
              <span className="rounded-full border border-[#DCC7A5] bg-[#FFF1D7] px-3 py-1.5 shadow-[0_1px_0_rgba(58,42,31,0.08)]">
                simple setup
              </span>
              <span className="rounded-full border border-[#DCC7A5] bg-[#FFF1D7] px-3 py-1.5 shadow-[0_1px_0_rgba(58,42,31,0.08)]">
                family-friendly
              </span>
              <span className="rounded-full border border-[#DCC7A5] bg-[#FFF1D7] px-3 py-1.5 shadow-[0_1px_0_rgba(58,42,31,0.08)]">
                zero overwhelm
              </span>
            </div>
          </div>

          {/* Desktop-only in-flow button */}
          <div className="hidden lg:mt-10 lg:block lg:max-w-[340px]">
            <SocialLoginButton
              label="login to meta"
              logo={<SiMeta className="h-6 w-6" aria-hidden="true" />}
              onClick={handleLogin}
            />
          </div>
        </div>

        {/* Right column: pot image — desktop only */}
        <div className="hidden lg:flex lg:w-[400px] lg:shrink-0 lg:items-center lg:justify-start xl:w-[460px]">
          <div className="relative h-[400px] w-[400px] splash-pot xl:h-[460px] xl:w-[460px]">
            <Image
              src="/pot.png"
              alt="Numnums cooking pot mascot"
              fill
              priority
              sizes="(max-width: 1280px) 400px, 480px"
              className="object-contain"
            />
            <span className="splash-veg-1 absolute left-4 top-[72px] h-7 w-7 rounded-full bg-[#58A6D6]" />
            <span className="splash-veg-2 absolute right-5 top-[92px] h-6 w-6 rounded-full bg-[#E58A45]" />
          </div>
        </div>

      </section>

      {/* Fixed CTA for mobile + tablet — lives outside the section to avoid iOS overflow/fixed bug */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 bg-gradient-to-t from-white via-white/90 to-transparent lg:hidden">
        <SocialLoginButton
          label="login to meta"
          logo={<SiMeta className="h-6 w-6" aria-hidden="true" />}
          onClick={handleLogin}
        />
      </div>
    </main>
  );
}
