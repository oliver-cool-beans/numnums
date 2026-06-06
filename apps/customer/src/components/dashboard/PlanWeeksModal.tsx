"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, Check, ChevronRight, Loader2, Minus, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase-client";
import { cn, getWeekAtOffset, getWeekLabel } from "@/lib/utils";
import { buildSchedule, fetchOnboardingRecipes, type OnboardingRecipe, type Weekday } from "@/lib/recipeSchedule";
import { persistWeekPlan, fetchWeekRecipeIds } from "@/lib/mealPlanActions";
import { getCurrentWeek } from "@/lib/utils";

const DEFAULT_DAYS: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const LOOK_AHEAD_WEEKS = 4;

type WeekEntry = {
  week: number;
  year: number;
  label: string;
  isPlanned: boolean;
};

type GenerateResult = {
  planned: number;
  skipped: number;
};

type PlanWeeksModalProps = {
  userId: string;
  onClose: () => void;
  onPlanWeek: (week: number, year: number) => void;
};

export function PlanWeeksModal({ userId, onClose, onPlanWeek }: PlanWeeksModalProps) {
  const [weeks, setWeeks] = useState<WeekEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoCount, setAutoCount] = useState(2);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const targets = Array.from({ length: LOOK_AHEAD_WEEKS }, (_, i) => getWeekAtOffset(i + 1));

      const { data } = await supabase
        .from("user_meal_plans")
        .select("week_number, year")
        .eq("user_id", userId)
        .in(
          "week_number",
          targets.map((t) => t.week),
        );

      if (!isMounted) return;

      const planned = new Set(
        (data ?? []).map((row: { week_number: number; year: number }) => `${row.year}-${row.week_number}`),
      );

      setWeeks(
        targets.map(({ week, year }) => ({
          week,
          year,
          label: getWeekLabel(week, year),
          isPlanned: planned.has(`${year}-${week}`),
        })),
      );
      setLoading(false);
    }

    void load();
    return () => { isMounted = false; };
  }, [userId]);

  const unplannedWeeks = weeks.filter((w) => !w.isPlanned);
  const canGenerate = unplannedWeeks.length > 0;

  const handleAutoGenerate = async () => {
    const targets = unplannedWeeks.slice(0, autoCount);
    if (targets.length === 0) return;

    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const allRecipes = await fetchOnboardingRecipes();

      // Get previous week's recipe IDs to avoid repeating them in the first generated week
      const prevWeek = getWeekAtOffset(0);
      const prevIds = new Set(
        await fetchWeekRecipeIds(userId, prevWeek.week, prevWeek.year),
      );

      let excludeIds = prevIds;
      let plannedCount = 0;

      for (const target of targets) {
        const pool = allRecipes.filter((r) => !excludeIds.has(r.id));
        // Fall back to full pool if not enough recipes remain after excluding
        const effectivePool = pool.length >= DEFAULT_DAYS.length ? pool : allRecipes;
        const meals = buildSchedule([], effectivePool, DEFAULT_DAYS, []);
        await persistWeekPlan(userId, meals, target.week, target.year);
        excludeIds = new Set(meals.map((m) => m.recipe.id));
        plannedCount++;
      }

      setResult({ planned: plannedCount, skipped: targets.length - plannedCount });

      // Refresh week statuses
      setWeeks((prev) =>
        prev.map((w) => {
          const wasTarget = targets.some((t) => t.week === w.week && t.year === w.year);
          return wasTarget ? { ...w, isPlanned: true } : w;
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const maxAutoCount = Math.max(1, unplannedWeeks.length);

  return (
    <div className="flex min-h-dvh flex-col bg-white px-4 pb-8 pt-3 text-[#3A2A1F]">
      {/* Header */}
      <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center">
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-full border border-[#D9CCBB] bg-white/80 text-[#3A2A1F] shadow-sm"
          onClick={onClose}
        >
          <ArrowLeft />
        </Button>
        <p className="text-center text-[28px] font-semibold leading-none tracking-[-0.02em] text-[#3A2A1F]">
          numnums
        </p>
        <div aria-hidden="true" className="size-11" />
      </div>

      <h1 className="mt-5 text-[1.8rem] font-semibold leading-[1.02]">Plan ahead</h1>
      <p className="mt-1 text-sm leading-5 text-[#6F5B4B]">
        Pick recipes for future weeks or let us auto-fill them for you.
      </p>

      {/* Week list */}
      <section className="mt-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#3A2A1F]">
          <Calendar className="size-4 text-[#7CB342]" />
          Upcoming weeks
        </div>

        {loading ? (
          <div className="mt-4 flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-[#9E8B7E]" />
          </div>
        ) : (
          <div className="mt-3 space-y-2.5">
            {weeks.map((w) => (
              <div
                key={`${w.year}-${w.week}`}
                className={cn(
                  "flex items-center justify-between rounded-[20px] border px-4 py-3.5",
                  w.isPlanned
                    ? "border-[#7CB342]/40 bg-[#F4FFE8]"
                    : "border-[#E8DCCB] bg-white",
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-[#3A2A1F]">{w.label}</p>
                  {w.isPlanned ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[#558B2F]">
                      <Check className="size-3" strokeWidth={2.5} />
                      Planned
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-[#9E8B7E]">Not yet planned</p>
                  )}
                </div>
                {w.isPlanned ? null : (
                  <button
                    type="button"
                    onClick={() => onPlanWeek(w.week, w.year)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#3A2A1F] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#5C4A3A]"
                  >
                    Plan
                    <ChevronRight className="size-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Auto-generate section */}
      {!loading && canGenerate && !result && (
        <section className="mt-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#3A2A1F]">
            <Sparkles className="size-4 text-[#7CB342]" />
            Auto-generate
          </div>
          <p className="mt-1 text-sm leading-5 text-[#6F5B4B]">
            We&apos;ll pick recipes automatically — no repeats from week to week. Same recipe
            can come back every 2+ weeks.
          </p>

          <div className="mt-4 flex items-center justify-between rounded-[20px] border border-[#E8DCCB] bg-white px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-[#3A2A1F]">Weeks to plan</p>
              <p className="text-xs text-[#9E8B7E]">
                {unplannedWeeks.slice(0, autoCount).map((w) => w.label).join(", ")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAutoCount((c) => Math.max(1, c - 1))}
                disabled={autoCount <= 1}
                className="flex size-8 items-center justify-center rounded-full border border-[#D9CCBB] bg-white text-[#3A2A1F] disabled:opacity-30"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-4 text-center text-base font-semibold text-[#3A2A1F]">
                {autoCount}
              </span>
              <button
                type="button"
                onClick={() => setAutoCount((c) => Math.min(maxAutoCount, c + 1))}
                disabled={autoCount >= maxAutoCount}
                className="flex size-8 items-center justify-center rounded-full border border-[#D9CCBB] bg-white text-[#3A2A1F] disabled:opacity-30"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-[16px] border border-[#E4B9A3] bg-[#FFF1EB] px-4 py-3 text-sm text-[#9A4B1E]">
              {error}
            </div>
          )}

          <Button
            className="mt-4 h-11 w-full rounded-full bg-[#7CB342] text-base font-semibold text-white hover:bg-[#689F38] disabled:bg-[#B7D58A]"
            onClick={() => void handleAutoGenerate()}
            disabled={generating}
          >
            {generating ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Generating {autoCount} week{autoCount > 1 ? "s" : ""}…
              </span>
            ) : (
              `Auto-generate ${autoCount} week${autoCount > 1 ? "s" : ""}`
            )}
          </Button>
        </section>
      )}

      {/* Success result */}
      {result && (
        <section className="mt-8">
          <div className="rounded-[20px] border border-[#7CB342]/40 bg-[#F4FFE8] px-5 py-5 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#E7F6DF]">
              <Check className="size-6 text-[#7CB342]" strokeWidth={2.5} />
            </div>
            <p className="mt-3 text-base font-semibold text-[#3A2A1F]">
              {result.planned} week{result.planned > 1 ? "s" : ""} planned!
            </p>
            <p className="mt-1 text-sm text-[#6F5B4B]">
              Recipes picked, shopping lists ready to go.
            </p>
          </div>
          <Button
            className="mt-4 h-11 w-full rounded-full bg-[#3A2A1F] text-base font-semibold text-white hover:bg-[#5C4A3A]"
            onClick={onClose}
          >
            Back to dashboard
          </Button>
        </section>
      )}

      {/* All weeks already planned */}
      {!loading && !canGenerate && !result && (
        <div className="mt-8 rounded-[20px] border border-[#7CB342]/40 bg-[#F4FFE8] px-5 py-5 text-center">
          <p className="text-base font-semibold text-[#3A2A1F]">All upcoming weeks are planned!</p>
          <p className="mt-1 text-sm text-[#6F5B4B]">Check back next week for more slots.</p>
        </div>
      )}
    </div>
  );
}
