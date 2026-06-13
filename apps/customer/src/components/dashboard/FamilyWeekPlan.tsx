"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Shuffle, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "@/lib/toast";

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
  voteOnRecipeSwapSuggestion,
} from "@/lib/familyMealPlanActions";
import { fetchWeekRecipeIds } from "@/lib/mealPlanActions";
import { RecipeSwapPicker } from "@/components/dashboard/RecipeSwapPicker";

type FamilyWeekPlanProps = {
  familyId: string;
  ownerId: string;
  ownerName?: string | null;
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

type PendingAction = "select" | "approve" | "dismiss" | "vote-yes" | "vote-no";
type PendingState = { day: Weekday; action: PendingAction } | null;

function SuggestionPanel({
  suggestion,
  isOwner,
  isOwnSuggestion,
  isPending,
  pendingAction,
  onApprove,
  onDismiss,
  onVoteYes,
  onVoteNo,
}: {
  suggestion: SwapSuggestion;
  isOwner: boolean;
  isOwnSuggestion: boolean;
  isPending: boolean;
  pendingAction: PendingAction | undefined;
  onApprove: () => void;
  onDismiss: () => void;
  onVoteYes: () => void;
  onVoteNo: () => void;
}) {
  const hasVotes = suggestion.yesVotes > 0 || suggestion.noVotes > 0;

  return (
    <div className="mt-2.5 rounded-[14px] bg-[#FFF7E8] px-3 py-2.5">
      <p className="text-xs leading-5 text-[#6F5B4B]">
        <span className="font-semibold text-[#3A2A1F]">{firstName(suggestion.suggestedByName)}</span>{" "}
        suggested swapping in{" "}
        <span className="font-semibold text-[#3A2A1F]">{suggestion.proposedRecipe.name}</span>
      </p>
      {hasVotes && (
        <p className="mt-1 text-[0.68rem] text-[#9E8B7E]">
          {suggestion.yesVotes} yes · {suggestion.noVotes} no
        </p>
      )}
      {isOwnSuggestion ? (
        <p className="mt-1.5 text-[0.68rem] font-medium uppercase tracking-wide text-[#B08D52]">
          Waiting for votes
        </p>
      ) : isOwner ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#7CB342] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#689F38] disabled:opacity-50"
          >
            {isPending && pendingAction === "approve" ? <Loader2 className="size-3.5 animate-spin" /> : <ThumbsUp className="size-3.5" />}
            Approve
          </button>
          <button
            type="button"
            onClick={onDismiss}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D9CCBB] bg-white px-3 py-1.5 text-xs font-semibold text-[#3A2A1F] transition-colors hover:bg-[#F5EDE0] disabled:opacity-50"
          >
            {isPending && pendingAction === "dismiss" ? <Loader2 className="size-3.5 animate-spin" /> : <ThumbsDown className="size-3.5" />}
            Dismiss
          </button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onVoteYes}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#7CB342] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#689F38] disabled:opacity-50"
          >
            {isPending && pendingAction === "vote-yes" ? <Loader2 className="size-3.5 animate-spin" /> : <ThumbsUp className="size-3.5" />}
            Yes
          </button>
          <button
            type="button"
            onClick={onVoteNo}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D9CCBB] bg-white px-3 py-1.5 text-xs font-semibold text-[#3A2A1F] transition-colors hover:bg-[#F5EDE0] disabled:opacity-50"
          >
            {isPending && pendingAction === "vote-no" ? <Loader2 className="size-3.5 animate-spin" /> : <ThumbsDown className="size-3.5" />}
            No
          </button>
        </div>
      )}
    </div>
  );
}

function DayActions({
  entry,
  isOwner,
  isPending,
  pendingAction,
  onSuggest,
  onSwitch,
}: {
  entry: { day: Weekday; recipe: { id: string } | null | undefined };
  isOwner: boolean;
  isPending: boolean;
  pendingAction: NonNullable<PendingState>["action"] | undefined;
  onSuggest: () => void;
  onSwitch: () => void;
}) {
  return (
    <div className="mt-2.5 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onSuggest}
        disabled={isPending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-[#D9CCBB] bg-white px-3 py-1.5 text-xs font-semibold text-[#3A2A1F] transition-colors hover:bg-[#F5EDE0]",
          isPending && "opacity-50",
        )}
      >
        {isPending && pendingAction === "select" ? <Loader2 className="size-3.5 animate-spin" /> : <Shuffle className="size-3.5" />}
        {entry.recipe ? "Suggest a swap" : "Suggest a recipe"}
      </button>
      {isOwner && (
        <button
          type="button"
          onClick={onSwitch}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#3A2A1F] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#5C4A3A] disabled:opacity-50"
        >
          Switch
        </button>
      )}
    </div>
  );
}

function firstName(name: string | null | undefined): string {
  return name?.split(" ")[0] ?? "Someone";
}

export function FamilyWeekPlan({ familyId, ownerId, ownerName, currentUserId, isOwner, week, year }: FamilyWeekPlanProps) {
  const [plan, setPlan] = useState<FamilyWeekPlanData | null>(null);
  const [suggestions, setSuggestions] = useState<SwapSuggestion[]>([]);
  const [recentRecipeIds, setRecentRecipeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
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
      try {
        await load();
      } catch (loadError) {
        if (isMounted) toast.error(loadError instanceof Error ? loadError.message : "We couldn't load this week's plan.");
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
      toast.error(refreshError instanceof Error ? refreshError.message : "We couldn't refresh this week's plan.");
    }
  };

  const suggestionByDay = new Map(suggestions.map((s) => [s.day, s]));

  const handlePickerSelect = async (recipe: OnboardingRecipe) => {
    if (!picker) return;
    const { day, mode, currentRecipeId } = picker;
    setPicker(null);
    setPending({ day, action: "select" });

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
      toast.error(actionError instanceof Error ? actionError.message : "That didn't go through. Please try again.");
    } finally {
      setPending(null);
    }
  };

  const handleVote = async (suggestion: SwapSuggestion, yes: boolean) => {
    setPending({ day: suggestion.day, action: yes ? "vote-yes" : "vote-no" });
    try {
      await voteOnRecipeSwapSuggestion(suggestion.id, yes);
      await refresh();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : "Couldn't record your vote.");
    } finally {
      setPending(null);
    }
  };

  const handleApprove = async (suggestion: SwapSuggestion) => {
    setPending({ day: suggestion.day, action: "approve" });
    try {
      await approveRecipeSwapSuggestion(suggestion.id, ownerId, week, year);
      await refresh();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : "Couldn't approve that suggestion.");
    } finally {
      setPending(null);
    }
  };

  const handleDismiss = async (suggestion: SwapSuggestion) => {
    setPending({ day: suggestion.day, action: "dismiss" });
    try {
      await dismissRecipeSwapSuggestion(suggestion.id);
      await refresh();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : "Couldn't dismiss that suggestion.");
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
          ? "You manage this plan. Approve suggestions from family members, or switch a recipe directly."
          : `You can suggest swaps — ${firstName(ownerName)} will review and approve them.`}
      </p>

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
                <SuggestionPanel
                  suggestion={suggestion}
                  isOwner={isOwner}
                  isOwnSuggestion={suggestion.suggestedByUserId === currentUserId}
                  isPending={isPending}
                  pendingAction={pending?.action}
                  onApprove={() => void handleApprove(suggestion)}
                  onDismiss={() => void handleDismiss(suggestion)}
                  onVoteYes={() => void handleVote(suggestion, true)}
                  onVoteNo={() => void handleVote(suggestion, false)}
                />
              ) : (
                <DayActions
                  entry={entry}
                  isOwner={isOwner}
                  isPending={isPending}
                  pendingAction={pending?.action}
                  onSuggest={() => setPicker({ day: entry.day, mode: "suggest", currentRecipeId: entry.recipe?.id ?? null })}
                  onSwitch={() => setPicker({ day: entry.day, mode: "switch", currentRecipeId: entry.recipe?.id ?? null })}
                />
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
          currentRecipeName={
            plan?.days.find((d) => d.day === picker.day)?.recipe?.name ?? null
          }
          recentRecipeIds={recentRecipeIds}
          onCancel={() => setPicker(null)}
          onSelect={(recipe) => void handlePickerSelect(recipe)}
        />
      )}
    </div>
  );
}
