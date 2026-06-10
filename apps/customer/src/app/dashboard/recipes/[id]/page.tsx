"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowUp,
  Check,
  Clock,
  ChefHat,
  AlignJustify,
  Layers,
  Copy,
} from "lucide-react";
import { useTodayRecipe } from "@/lib/hooks";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase-client";
import { Skeleton } from "@/components/ui/skeleton";

// ── Instruction parser ────────────────────────────────────────────────────────

type Segment = {
  kind: "text" | "time" | "temp" | "paren";
  text: string;
  offset: number;
};

// Three focused patterns, each well under the complexity limit
const PAREN_RE = /\([^)]+\)/g;
const TIME_RE = /\d+(?:\s*-\s*\d+)?\s*(?:min\w*|hour\w*|hr\w*|sec\w*)/gi;
const TEMP_RE = /\d+\s*°[CF]/gi;

function collectMatches(re: RegExp, kind: Segment["kind"], raw: string): Segment[] {
  const out: Segment[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    out.push({ kind, text: m[0], offset: m.index });
  }
  return out;
}

function parseSegments(raw: string): Segment[] {
  const tokens = [
    ...collectMatches(PAREN_RE, "paren", raw),
    ...collectMatches(TIME_RE, "time", raw),
    ...collectMatches(TEMP_RE, "temp", raw),
  ]
    .sort((a, b) => a.offset - b.offset)
    // drop any token that overlaps the previous one
    .filter((t, i, arr) => i === 0 || t.offset >= arr[i - 1].offset + arr[i - 1].text.length);

  const segs: Segment[] = [];
  let last = 0;

  for (const token of tokens) {
    if (token.offset > last) {
      segs.push({ kind: "text", text: raw.slice(last, token.offset), offset: last });
    }
    segs.push(token);
    last = token.offset + token.text.length;
  }

  if (last < raw.length) {
    segs.push({ kind: "text", text: raw.slice(last), offset: last });
  }

  return segs;
}

function InstructionBullet({ text }: { text: string }) {
  return (
    <p className="text-xl leading-relaxed text-[#3A2A1F]">
      {parseSegments(text).map((seg) => {
        if (seg.kind === "time")
          return (
            <span
              key={seg.offset}
              className="mx-0.5 inline-flex items-center rounded-md bg-[#E7F6DF] px-1.5 py-0.5 text-sm font-semibold text-[#4a8a55]"
            >
              {seg.text}
            </span>
          );
        if (seg.kind === "temp")
          return (
            <span
              key={seg.offset}
              className="mx-0.5 inline-flex items-center rounded-md bg-[#FFE7A3] px-1.5 py-0.5 text-sm font-semibold text-[#7a5c00]"
            >
              {seg.text}
            </span>
          );
        if (seg.kind === "paren")
          return (
            <span key={seg.offset} className="text-[#A89080]">
              {seg.text}
            </span>
          );
        return <span key={seg.offset}>{seg.text}</span>;
      })}
    </p>
  );
}

function StepImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className={className ?? "relative mt-4 w-full overflow-hidden rounded-[20px] bg-[#D9CCBB] shadow-[0_4px_16px_rgba(58,42,31,0.10)]"}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 390px, 680px"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function formatIngredientName(handle: string): string {
  return handle.replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveStepImageUrl(imageAssets: { url: string }[]): string | null {
  const asset = imageAssets.find((a) => typeof a?.url === "string" && a.url.startsWith("http"));
  return asset?.url ?? null;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RecipePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const recipeId = params.id as string;
  const { recipe, loading } = useTodayRecipe(user?.id, recipeId);

  const containerRef = useRef<HTMLDivElement>(null);
  const [smoothMode, setSmoothMode] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [ingredientsCopied, setIngredientsCopied] = useState(false);

  const copyIngredients = () => {
    const lines = [`${recipe?.name ?? "Recipe"} – ingredients:`];
    for (const ing of recipe?.ingredients ?? []) {
      const name = formatIngredientName(ing.handle);
      const qty = ing.quantity != null ? ` – ${ing.quantity}${ing.unit ? ` ${ing.unit}` : ""}` : "";
      lines.push(`• ${name}${qty}`);
    }
    navigator.clipboard.writeText(lines.join("\n"));
    setIngredientsCopied(true);
    setTimeout(() => setIngredientsCopied(false), 2000);
  };

  const toggleIngredient = (handle: string) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(handle)) next.delete(handle);
      else next.add(handle);
      return next;
    });
  };
  // Keep screen awake while cooking; release immediately on navigation away
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let active = true;
    let sentinel: WakeLockSentinel | null = null;

    const acquire = async () => {
      try {
        const lock = await (navigator as Navigator & { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } }).wakeLock.request("screen");
        if (!active) {
          // component already unmounted while we were awaiting — release immediately
          lock.release();
        } else {
          sentinel = lock;
        }
      } catch {
        // unsupported or permission denied — silently ignore
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") acquire();
    };

    acquire();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      sentinel?.release();
    };
  }, []);

  const progressSentRef = useRef(false);

  // Mark in_progress when the recipe is first opened
  useEffect(() => {
    if (!recipe || !user?.id || progressSentRef.current) return;
    if (recipe.progress.status !== "not_started") {
      progressSentRef.current = true;
      return;
    }
    progressSentRef.current = true;
    supabase.from("user_recipe_progress").upsert(
      {
        user_id: user.id,
        recipe_id: recipe.id,
        status: "in_progress",
        started_at: new Date().toISOString(),
        current_step_number: 1,
      },
      { onConflict: "user_id,recipe_id" },
    );
  }, [recipe, user?.id]);

  const handleComplete = async () => {
    if (!user?.id) return;
    await supabase.from("user_recipe_progress").upsert(
      {
        user_id: user.id,
        recipe_id: recipeId,
        status: "completed",
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,recipe_id" },
    );
    router.back();
  };

  const scrollToTop = () => {
    containerRef.current?.scrollTo({
      top: 0,
      behavior: smoothMode ? "smooth" : "instant",
    });
  };

  // Mirror the overview section's layout so the real content can drop straight
  // into place once it lands, instead of replacing an unrelated loading state.
  if (loading) {
    return (
      <main className="relative mx-auto w-full max-w-[390px] md:max-w-[680px]">
        <section className="flex h-dvh flex-col bg-background px-5 pb-8 pt-16">
          <button
            onClick={() => router.back()}
            className="absolute left-4 top-4 z-20 rounded-full bg-[#EADFCE] p-2.5 text-[#3A2A1F]"
          >
            <ArrowLeft size={18} />
          </button>

          <Skeleton className="aspect-[4/3] w-full rounded-[24px] bg-[#D9CCBB]/60" />

          <div className="mt-5 flex flex-1 flex-col">
            <Skeleton className="h-7 w-3/4 bg-[#EADFCE]" />
            <Skeleton className="mt-2 h-4 w-1/2 bg-[#EADFCE]" />
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-9 w-28 rounded-full bg-[#EADFCE]" />
              <Skeleton className="h-9 w-24 rounded-full bg-[#EADFCE]" />
            </div>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-full bg-[#EADFCE]" />
              <Skeleton className="h-4 w-5/6 bg-[#EADFCE]" />
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!recipe) {
    return (
      <main className="mx-auto flex h-dvh w-full max-w-[390px] flex-col items-center justify-center gap-4 bg-background md:max-w-[680px]">
        <p className="text-[#6F5B4B]">Recipe not found</p>
        <button onClick={() => router.back()} className="text-sm text-[#5FA66B] underline">
          Go back
        </button>
      </main>
    );
  }

  return (
    <main className="relative mx-auto w-full max-w-[390px] md:max-w-[680px]">
      {/* Scroll-mode toggle — fixed top-right, very subtle */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 mx-auto flex max-w-[390px] justify-end p-4 md:max-w-[680px]">
        <button
          onClick={() => setSmoothMode((m) => !m)}
          aria-label={smoothMode ? "Switch to snap scroll" : "Switch to smooth scroll"}
          className={`pointer-events-auto rounded-full p-2.5 backdrop-blur-sm transition-all duration-200 ${
            smoothMode ? "bg-[#7CB342]/70 text-white" : "bg-black/15 text-white/80"
          }`}
        >
          {smoothMode ? <Layers size={15} /> : <AlignJustify size={15} />}
        </button>
      </div>

      {/* Snap-scroll container */}
      <div
        ref={containerRef}
        className="h-dvh overflow-y-scroll"
        style={{
          scrollSnapType: "y mandatory",
          scrollBehavior: smoothMode ? "smooth" : "auto",
        }}
      >
        {/* ── Section 1: Overview ── */}
        <section
          className="flex h-dvh flex-col bg-background px-5 pb-8 pt-16"
          style={{ scrollSnapAlign: "start" }}
        >
          <button
            onClick={() => router.back()}
            className="absolute left-4 top-4 z-20 rounded-full bg-[#EADFCE] p-2.5 text-[#3A2A1F]"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Image card */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[24px] bg-[#D9CCBB] shadow-[0_4px_16px_rgba(58,42,31,0.10)]">
            {recipe.image_url ? (
              <Image
                src={recipe.image_url}
                alt={recipe.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 390px, 680px"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl">🍽️</div>
            )}
          </div>

          {/* Info */}
          <div className="mt-5 flex flex-1 flex-col">
            <h1 className="text-[1.6rem] font-semibold leading-tight text-[#3A2A1F]">
              {recipe.name}
            </h1>
            {recipe.headline && (
              <p className="mt-1 text-base text-[#6F5B4B]">{recipe.headline}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="flex items-center gap-2 rounded-full bg-[#EADFCE] px-4 py-2 text-sm font-medium text-[#3A2A1F]">
                <Clock size={16} />
                {recipe.total_minutes} min
              </span>
              {recipe.difficulty && (
                <span className="flex items-center gap-2 rounded-full bg-[#EADFCE] px-4 py-2 text-sm font-medium text-[#3A2A1F]">
                  <ChefHat size={16} />
                  <span className="capitalize">{recipe.difficulty}</span>
                </span>
              )}
            </div>
            {recipe.description && (
              <p className="mt-3 flex-1 text-sm leading-relaxed text-[#6F5B4B]">{recipe.description}</p>
            )}
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-[#A89080]">
              {recipe.ingredients.length > 0 ? "Swipe up for ingredients" : "Swipe up to begin"}
            </span>
            <span className="animate-bounce text-lg text-[#7CB342]">↓</span>
          </div>
        </section>

        {/* ── Ingredients Section ── */}
        {recipe.ingredients.length > 0 && (
          <section
            className="flex h-dvh flex-col bg-background px-5 pb-8 pt-14"
            style={{ scrollSnapAlign: "start" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-[#A89080]">
              What you&apos;ll need
            </p>
            <div className="mt-1 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-[#3A2A1F]">Ingredients</h2>
              <button
                onClick={copyIngredients}
                aria-label="Copy ingredients"
                className="flex items-center justify-center rounded-full p-2 text-[#A89080] transition-colors active:text-[#3A2A1F]"
              >
                {ingredientsCopied ? <Check size={18} strokeWidth={2.5} className="text-[#7CB342]" /> : <Copy size={18} />}
              </button>
            </div>
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
              <div className="flex flex-col divide-y divide-[#EADFCE]">
                {recipe.ingredients.map((ing) => {
                  const checked = checkedIngredients.has(ing.handle);
                  return (
                    <button
                      key={ing.handle}
                      onClick={() => toggleIngredient(ing.handle)}
                      className="flex items-center gap-4 py-3.5 text-left"
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${checked ? "border-[#7CB342] bg-[#7CB342]" : "border-[#D9CCBB]"}`}>
                        {checked && <Check size={14} strokeWidth={3} className="text-white" />}
                      </span>
                      <span className={`flex flex-1 items-baseline justify-between transition-opacity ${checked ? "opacity-40" : ""}`}>
                        <span className={`text-base text-[#3A2A1F] ${checked ? "line-through decoration-[#A89080]" : ""}`}>
                          {formatIngredientName(ing.handle)}
                        </span>
                        {ing.quantity != null && (
                          <span className="ml-3 shrink-0 text-sm text-[#A89080]">
                            {ing.quantity}{ing.unit ? ` ${ing.unit}` : ""}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 pt-2">
              <span className="text-xs text-[#A89080]">Swipe up to begin</span>
              <span className="animate-bounce text-lg text-[#7CB342]">↓</span>
            </div>
          </section>
        )}

        {/* ── Step Sections ── */}
        {recipe.steps.map((step) => {
          const subSteps = step.instructions
            .split("•")
            .map((s) => s.trim())
            .filter(Boolean);
          const stepImageUrl = resolveStepImageUrl(step.image_assets);

          return (
            <section
              key={step.id}
              className="flex h-dvh flex-col bg-background px-5 pb-8 pt-10"
              style={{ scrollSnapAlign: "start" }}
            >
              {/* Header row: step label + progress dots */}
              <div className="relative flex h-9 items-center justify-end">
                <div className="absolute left-1/2 flex -translate-x-1/2 items-baseline gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#558B2F]">
                    Step {step.step_number}
                  </span>
                  <span className="text-xs text-[#A89080]">of {recipe.steps.length}</span>
                </div>
                <div className="flex gap-1.5">
                  {recipe.steps.map((s) => (
                    <div
                      key={s.id}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        s.step_number === step.step_number
                          ? "w-5 bg-[#7CB342]"
                          : "w-1.5 bg-[#D9CCBB]"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-3 h-px bg-[#EADFCE]" />

              {/* Step image — fixed height */}
              {stepImageUrl && (
                <StepImage
                  src={stepImageUrl}
                  alt={`Step ${step.step_number}`}
                  className="relative mt-4 h-52 w-full shrink-0 overflow-hidden rounded-[20px] bg-[#D9CCBB] shadow-[0_4px_16px_rgba(58,42,31,0.10)]"
                />
              )}

              {/* Parsed instruction bullets — scrollable if text overflows */}
              <div className="flex min-h-0 flex-1 flex-col justify-start space-y-5 overflow-y-auto py-6">
                {subSteps.map((sub) => (
                  <div key={sub} className="flex gap-3">
                    <div className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-[#7CB342]" />
                    <InstructionBullet text={sub} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {/* ── Final Section: Complete ── */}
        <section
          className="flex h-dvh flex-col items-center justify-center bg-background px-8 pb-10 pt-8"
          style={{ scrollSnapAlign: "start" }}
        >
          {/* Hero image */}
          <div className="relative w-full overflow-hidden rounded-[24px] bg-[#D9CCBB] shadow-[0_4px_16px_rgba(58,42,31,0.10)]" style={{ aspectRatio: "4/3" }}>
            {recipe.image_url ? (
              <Image
                src={recipe.image_url}
                alt={recipe.name}
                fill
                className="object-cover"
                sizes="390px"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl">🍽️</div>
            )}
          </div>

          {/* Title & subtitle */}
          <h2 className="mt-6 text-center text-[1.6rem] font-semibold leading-tight text-[#3A2A1F]">
            {recipe.name}
          </h2>
          {recipe.headline && (
            <p className="mt-1 text-center text-base text-[#6F5B4B]">{recipe.headline}</p>
          )}

          {recipe.progress.status === "completed" ? (
            <div className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-[#E7F6DF] py-4 font-semibold text-[#4a8a55]">
              <Check size={20} />
              Dinner done!
            </div>
          ) : (
            <button
              onClick={handleComplete}
              className="mt-8 w-full rounded-full bg-[#7CB342] py-4 font-semibold text-white transition-all active:scale-[0.97]"
            >
              Mark as complete
            </button>
          )}
          <button
            onClick={scrollToTop}
            className="mt-4 flex items-center gap-1.5 text-sm text-[#6F5B4B]"
          >
            <ArrowUp size={14} />
            Back to top
          </button>
        </section>
      </div>
    </main>
  );
}
