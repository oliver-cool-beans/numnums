"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Shuffle, ThumbsDown, ThumbsUp } from "lucide-react";

import { cn, getWeekAtOffset } from "@/lib/utils";
import type { Weekday, OnboardingRecipe } from "@/lib/recipeSchedule";
import {
  type FamilyWeekPlan as FamilyWeekPlanData,
  type SwapSuggestion,
  approveRecipeSwapSuggestion,
  dismissRecipeSwapSuggestion,
  fetchFamilySwapSuggestions,
  fetchFamilyWeekPlan,
  suggestRecipeSwap,
  switchMealPlanRecipe,
} from "@/lib/familyMealPlanActions";
import { fetchWeekRecipeIds } from "@/lib/mealPlanActions";
import { RecipeSwapPicker } from "@/components/dashboard/RecipeSwapPicker";

type FamilyWeekPlanProps = {
  familyId: string;
  ownerId: string;
  currentUserId: string;
  isOwner: boolean;
  week: number;
  year: number;
};

type PickerState = {
  day: Weekday;
  mode: "suggest" | "switch";
  currentRecipeId: string | null;
};

type PendingState = { day: Weekday; action: "select" | "approve" | "dismiss" } | null;

export function FamilyWeekPlan({ familyId, ownerId, currentUserId, isOwner, week, year }: FamilyWeekPlanProps) {
  const [plan, setPlan] = useState<FamilyWeekPlanData | null>(null);
  const [suggestions, setSuggestions] = useState<SwapSuggestion[]>([]);
  const [recentRecipeIds, setRecentRecipeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [pending, setPending] = useState<PendingState>(null);

  const load = useCallback(async () => {
    const lastWeek = getWeekAtOffset(-1);
    const [weekPlan, weekSuggestions, recentIds] = await Promise.all([
      fetchFamilyWeekPlan(ownerId, week, year),
      fetchFamilySwapSuggestions(familyId, week, year),
      fetchWeekRecipeIds(ownerId, lastWeek.week, lastWeek.year),
    ]);
    setPlan(weekPlan);
    setSuggestions(weekSuggestions);
    setRecentRecipeIds(new Set(recentIds));
  }, [ownerId, familyId, week, year]);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      if (!isMounted) return;
      setLoading(true);
      setError(null);
      try {
        await load();
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : "We couldn't load this week's plan.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [load]);

  const refresh = async () => {
    try {
      await load();
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "We couldn't refresh this week's plan.");
    }
  };

  const suggestionByDay = new Map(suggestions.map((s) => [s.day, s]));

  const handlePickerSelect = async (recipe: OnboardingRecipe) => {
    if (!picker) return;
    const { day, mode, currentRecipeId } = picker;
    setPicker(null);
    setPending({ day, action: "select" });
    setError(null);

    try {
      if (mode === "switch") {
        await switchMealPlanRecipe(ownerId, week, year, day, recipe.id);
      } else {
        await suggestRecipeSwap({
          familyId,
          ownerId,
          week,
          year,
          day,
          currentRecipeId,
          proposedRecipeId: recipe.id,
          suggestedByUserId: currentUserId,
        });
      }
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "That didn't go through. Please try again.");
    } finally {
      setPending(null);
    }
  };

  const handleApprove = async (suggestion: SwapSuggestion) => {
    setPending({ day: suggestion.day, action: "approve" });
    setError(null);
    try {
      await approveRecipeSwapSuggestion(suggestion.id);
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Couldn't approve that suggestion.");
    } finally {
      setPending(null);
    }
  };

  const handleDismiss = async (suggestion: SwapSuggestion) => {
    setPending({ day: suggestion.day, action: "dismiss" });
    setError(null);
    try {
      await dismissRecipeSwapSuggestion(suggestion.id);
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Couldn't dismiss that suggestion.");
    } finally {
      setPending(null);
    }
  };

  if (loading) {
    return (
      <div className="mt-4 flex items-center justify-center rounded-2xl border border-[#F0E8DE] py-6">
        <Loader2 className="size-5 animate-spin text-[#9E8B7E]" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FAF6F2] px-4 py-4 text-center">
        <p className="text-sm text-[#6F5B4B]">
          {ownerId === currentUserId
            ? "Plan your week to start managing it together."
            : "The owner hasn't planned this week yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <p className="px-1 text-xs text-[#6F5B4B]">
        {isOwner
          ? "Approve suggestions, switch a recipe directly, or suggest your own swap."
          : "Suggest a swap — the family owner will review it."}
      </p>

      {error && (
        <div className="mt-3 rounded-[16px] border border-[#E4B9A3] bg-[#FFF1EB] px-4 py-3 text-sm text-[#9A4B1E]">
          {error}
        </div>
      )}

      <ul className="mt-3 space-y-2">
        {plan.days.map((entry) => {
          const suggestion = suggestionByDay.get(entry.day);
          const isPending = pending?.day === entry.day;
          const dayLabel = entry.dayLabel.charAt(0) + entry.dayLabel.slice(1).toLowerCase();

          return (
            <li key={entry.day} className="rounded-2xl border border-[#F0E8DE] px-3 py-3">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px] bg-[#E7D9CD]">
                  {entry.recipe?.image_url && (
                    <Image src={entry.recipe.image_url} alt={entry.recipe.name} fill className="object-cover" sizes="48px" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9E8B7E]">{dayLabel}</p>
                  <p className="truncate text-sm font-medium text-[#3A2A1F]">
                    {entry.recipe?.name ?? "Nothing planned"}
                  </p>
                </div>
              </div>

              {suggestion ? (
                <div className="mt-2.5 rounded-[14px] bg-[#FFF7E8] px-3 py-2.5">
                  <p className="text-xs leading-5 text-[#6F5B4B]">
                    <span className="font-semibold text-[#3A2A1F]">{suggestion.suggestedByName ?? "Someone"}</span>{" "}
                    suggested swapping in{" "}
                    <span className="font-semibold text-[#3A2A1F]">{suggestion.proposedRecipe.name}</span>
                  </p>
                  {isOwner ? (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleApprove(suggestion)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#7CB342] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#689F38] disabled:opacity-50"
                      >
                        {isPending && pending?.action === "approve" ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <ThumbsUp className="size-3.5" />
                        )}
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDismiss(suggestion)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#D9CCBB] bg-white px-3 py-1.5 text-xs font-semibold text-[#3A2A1F] transition-colors hover:bg-[#F5EDE0] disabled:opacity-50"
                      >
                        {isPending && pending?.action === "dismiss" ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <ThumbsDown className="size-3.5" />
                        )}
                        Dismiss
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[0.68rem] font-medium uppercase tracking-wide text-[#B08D52]">
                      Pending owner review
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPicker({ day: entry.day, mode: "suggest", currentRecipeId: entry.recipe?.id ?? null })
                    }
                    disabled={isPending}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border border-[#D9CCBB] bg-white px-3 py-1.5 text-xs font-semibold text-[#3A2A1F] transition-colors hover:bg-[#F5EDE0]",
                      isPending && "opacity-50",
                    )}
                  >
                    {isPending && pending?.action === "select" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Shuffle className="size-3.5" />
                    )}
                    Suggest a swap
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() =>
                        setPicker({ day: entry.day, mode: "switch", currentRecipeId: entry.recipe?.id ?? null })
                      }
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#3A2A1F] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#5C4A3A] disabled:opacity-50"
                    >
                      Switch
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {picker && (
        <RecipeSwapPicker
          userId={currentUserId}
          day={picker.day}
          title={picker.mode === "switch" ? "Switch recipe" : "Suggest a swap"}
          currentRecipeId={picker.currentRecipeId}
          recentRecipeIds={recentRecipeIds}
          onCancel={() => setPicker(null)}
          onSelect={(recipe) => void handlePickerSelect(recipe)}
        />
      )}
    </div>
  );
}
