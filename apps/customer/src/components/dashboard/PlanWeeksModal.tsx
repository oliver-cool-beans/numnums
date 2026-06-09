"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, Check, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase-client";
import { cn, getWeekAtOffset, getWeekLabel } from "@/lib/utils";
import { buildSchedule, fetchOnboardingRecipes, getFilteredRecipes, type Weekday } from "@/lib/recipeSchedule";
import { persistWeekPlan, fetchWeekRecipeIds } from "@/lib/mealPlanActions";
import { fetchDietaryPreferences } from "@/lib/dietaryPreferences";

const DEFAULT_DAYS: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const LOOK_AHEAD_WEEKS = 4;

type WeekEntry = {
  week: number;
  year: number;
  label: string;
  isCurrent: boolean;
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
  onViewWeek: (week: number, year: number) => void;
};

export function PlanWeeksModal({ userId, onClose, onPlanWeek, onViewWeek }: PlanWeeksModalProps) {
  const [weeks, setWeeks] = useState<WeekEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingWeekKey, setGeneratingWeekKey] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const targets = Array.from({ length: LOOK_AHEAD_WEEKS + 1 }, (_, i) => getWeekAtOffset(i));

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
        targets.map(({ week, year }, index) => ({
          week,
          year,
          label: getWeekLabel(week, year),
          isCurrent: index === 0,
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

  const generateWeeks = async (targets: WeekEntry[]) => {
    const [allRecipes, preferences] = await Promise.all([
      fetchOnboardingRecipes(),
      fetchDietaryPreferences(userId),
    ]);

    // Seed variety against last week's recipes so the new picks don't just repeat them
    const lastWeek = getWeekAtOffset(-1);
    const lastWeekIds = new Set(
      await fetchWeekRecipeIds(userId, lastWeek.week, lastWeek.year),
    );

    let excludeIds = lastWeekIds;
    let plannedCount = 0;

    for (const target of targets) {
      const pool = allRecipes.filter((r) => !excludeIds.has(r.id));
      // Fall back to full pool if not enough recipes remain after excluding
      const effectivePool = pool.length >= DEFAULT_DAYS.length ? pool : allRecipes;
      const filteredPool = getFilteredRecipes(effectivePool, preferences);
      const meals = buildSchedule([], filteredPool, DEFAULT_DAYS, preferences);
      await persistWeekPlan(userId, meals, target.week, target.year);
      excludeIds = new Set(meals.map((m) => m.recipe.id));
      plannedCount++;
    }

    setWeeks((prev) =>
      prev.map((w) => {
        const wasTarget = targets.some((t) => t.week === w.week && t.year === w.year);
        return wasTarget ? { ...w, isPlanned: true } : w;
      }),
    );

    return plannedCount;
  };

  const handleAutoGenerateAll = async () => {
    const targets = unplannedWeeks;
    if (targets.length === 0) return;

    setGeneratingAll(true);
    setError(null);
    setResult(null);

    try {
      const plannedCount = await generateWeeks(targets);
      setResult({ planned: plannedCount, skipped: targets.length - plannedCount });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed. Please try again.");
    } finally {
      setGeneratingAll(false);
    }
  };

  const handleAutoGenerateWeek = async (target: WeekEntry) => {
    const key = `${target.year}-${target.week}`;
    setGeneratingWeekKey(key);
    setError(null);

    try {
      await generateWeeks([target]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed. Please try again.");
    } finally {
      setGeneratingWeekKey(null);
    }
  };

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
        Pick recipes for this week or any week ahead, or let us auto-fill them for you.
      </p>

      {/* Week list */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#3A2A1F]">
            <Calendar className="size-4 text-[#7CB342]" />
            This week & beyond
          </div>
          {!loading && canGenerate && (
            <button
              type="button"
              onClick={() => void handleAutoGenerateAll()}
              disabled={generatingAll || generatingWeekKey !== null}
              aria-label="Auto-generate all upcoming weeks"
              title="Auto-generate all upcoming weeks"
              className="flex size-8 items-center justify-center rounded-full bg-[#7CB342] text-white transition-colors hover:bg-[#689F38] disabled:opacity-50"
            >
              {generatingAll ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-[16px] border border-[#E4B9A3] bg-[#FFF1EB] px-4 py-3 text-sm text-[#9A4B1E]">
            {error}
          </div>
        )}

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
                <button
                  type="button"
                  onClick={() => onViewWeek(w.week, w.year)}
                  className="text-left"
                >
                  <p className="text-sm font-semibold text-[#3A2A1F] underline-offset-2 hover:underline">
                    {w.isCurrent ? "This week" : w.label}
                  </p>
                  {w.isPlanned ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[#558B2F]">
                      <Check className="size-3" strokeWidth={2.5} />
                      {w.isCurrent ? `Planned · ${w.label}` : "Planned"}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-[#9E8B7E]">
                      {w.isCurrent ? `Not yet planned · ${w.label}` : "Not yet planned"}
                    </p>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  {!w.isPlanned && (
                    <button
                      type="button"
                      onClick={() => void handleAutoGenerateWeek(w)}
                      disabled={generatingAll || generatingWeekKey !== null}
                      aria-label={`Auto-generate ${w.label}`}
                      title={`Auto-generate ${w.label}`}
                      className="flex size-7 items-center justify-center rounded-full border border-[#D9CCBB] bg-white text-[#7CB342] transition-colors hover:bg-[#F4FFE8] disabled:opacity-40"
                    >
                      {generatingWeekKey === `${w.year}-${w.week}` ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="size-3.5" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onPlanWeek(w.week, w.year)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#3A2A1F] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#5C4A3A]"
                  >
                    {w.isPlanned ? "Re-plan" : "Plan"}
                    <ChevronRight className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
          <p className="text-base font-semibold text-[#3A2A1F]">You&apos;re all planned up!</p>
          <p className="mt-1 text-sm text-[#6F5B4B]">
            Use re-plan or re-generate above if you&apos;d like to change any week.
          </p>
        </div>
      )}
    </div>
  );
}
