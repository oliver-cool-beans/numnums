"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase-client";
import { cn, getWeekAtOffset, getWeekLabel } from "@/lib/utils";
import { generateWeekPlan } from "@/lib/mealPlanActions";

const LOOK_AHEAD_WEEKS = 4;

type WeekEntry = {
  week: number;
  year: number;
  label: string;
  relativeLabel: string;
  isCurrent: boolean;
  isPlanned: boolean;
};

type PlanWeeksModalProps = {
  userId: string;
  onClose: () => void;
  onViewWeek: (week: number, year: number) => void;
};

export function PlanWeeksModal({ userId, onClose, onViewWeek }: PlanWeeksModalProps) {
  const [weeks, setWeeks] = useState<WeekEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingWeekKey, setGeneratingWeekKey] = useState<string | null>(null);
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

      const relativeLabels = ["This week", "Next week", "In 2 weeks", "In 3 weeks", "In 4 weeks"];

      setWeeks(
        targets.map(({ week, year }, index) => ({
          week,
          year,
          label: getWeekLabel(week, year),
          relativeLabel: relativeLabels[index] ?? `In ${index} weeks`,
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

  const handleGenerateWeek = async (target: WeekEntry) => {
    const key = `${target.year}-${target.week}`;
    setGeneratingWeekKey(key);
    setError(null);

    try {
      await generateWeekPlan(userId, target.week, target.year);
      setWeeks((prev) =>
        prev.map((w) => (w.week === target.week && w.year === target.year ? { ...w, isPlanned: true } : w)),
      );
      onViewWeek(target.week, target.year);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed. Please try again.");
    } finally {
      setGeneratingWeekKey(null);
    }
  };

  const handleAutoGenerateAll = async () => {
    const targets = unplannedWeeks;
    if (targets.length === 0) return;

    setGeneratingAll(true);
    setError(null);

    try {
      let excludeIds: Set<string> | undefined;
      for (const target of targets) {
        const meals = await generateWeekPlan(userId, target.week, target.year, excludeIds);
        excludeIds = new Set(meals.map((m) => m.recipe.id));
      }
      setWeeks((prev) =>
        prev.map((w) => {
          const wasTarget = targets.some((t) => t.week === w.week && t.year === w.year);
          return wasTarget ? { ...w, isPlanned: true } : w;
        }),
      );
      // Navigate to the first generated week
      onViewWeek(targets[0].week, targets[0].year);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed. Please try again.");
    } finally {
      setGeneratingAll(false);
    }
  };

  const canGenerateAll = unplannedWeeks.length > 1;
  const isBusy = generatingAll || generatingWeekKey !== null;

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
        Generate recipes for this week or any week ahead. You can swap or tweak individual meals after.
      </p>

      {/* Week list */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#3A2A1F]">
            <Calendar className="size-4 text-[#7CB342]" />
            This week &amp; beyond
          </div>
          {!loading && canGenerateAll && (
            <button
              type="button"
              onClick={() => void handleAutoGenerateAll()}
              disabled={isBusy}
              aria-label="Generate all upcoming weeks"
              title="Generate all upcoming weeks"
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
            {weeks.map((w) => {
              const key = `${w.year}-${w.week}`;
              const isGenerating = generatingWeekKey === key;
              return (
                <div
                  key={key}
                  className={cn(
                    "relative flex items-center justify-between rounded-[20px] border px-4 py-3.5",
                    w.isPlanned
                      ? "border-[#7CB342]/40 bg-[#F4FFE8]"
                      : "border-[#E8DCCB] bg-white",
                  )}
                >
                  {/* Full-row tap target for planned weeks */}
                  {w.isPlanned && (
                    <button
                      type="button"
                      onClick={() => onViewWeek(w.week, w.year)}
                      aria-label={`View ${w.isCurrent ? "this week" : w.label}`}
                      className="absolute inset-0 rounded-[20px]"
                    />
                  )}
                  <div className="relative z-10 text-left">
                    <p className="text-sm font-semibold text-[#3A2A1F]">
                      {w.relativeLabel}
                    </p>
                    <p className="mt-0.5 text-xs text-[#9E8B7E]">{w.label}</p>
                    {w.isPlanned && (
                      <p className="mt-0.5 text-xs text-[#558B2F]">Planned</p>
                    )}
                  </div>
                  {!w.isPlanned && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void handleGenerateWeek(w); }}
                      disabled={isBusy}
                      aria-label={`Generate ${w.label}`}
                      className="relative z-10 inline-flex items-center gap-1.5 rounded-full bg-[#3A2A1F] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#5C4A3A] disabled:opacity-40"
                    >
                      {isGenerating ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="size-3.5" />
                      )}
                      Generate
                      <ChevronRight className="size-3" />
                    </button>
                  )}
                  {w.isPlanned && (
                    <ChevronRight className="relative z-10 size-4 shrink-0 text-[#7CB342]" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* All weeks already planned */}
      {!loading && weeks.length > 0 && weeks.every((w) => w.isPlanned) && (
        <div className="mt-8 rounded-[20px] border border-[#7CB342]/40 bg-[#F4FFE8] px-5 py-5 text-center">
          <p className="text-base font-semibold text-[#3A2A1F]">You&apos;re all planned up!</p>
          <p className="mt-1 text-sm text-[#6F5B4B]">
            Tap a week to view or regenerate your recipes.
          </p>
        </div>
      )}
    </div>
  );
}
