"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import { getCurrentWeek } from "@/lib/utils";
import {
  type SwapSuggestion,
  fetchFamilySwapSuggestions,
  approveRecipeSwapSuggestion,
  dismissRecipeSwapSuggestion,
  voteOnRecipeSwapSuggestion,
} from "@/lib/familyMealPlanActions";

type PendingAction = { id: string; action: "approve" | "dismiss" | "vote-yes" | "vote-no" };

function firstName(name: string | null | undefined): string {
  return name?.split(" ")[0] ?? "Someone";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function RecipeThumbs({
  current,
  proposed,
}: {
  current: { image_url: string | null; name: string } | null;
  proposed: { image_url: string | null; name: string };
}) {
  return (
    // Two thumbnails overlapping: current sits behind, proposed floats in front
    <div className="relative h-11 w-[58px] shrink-0">
      <div className="absolute left-0 top-0 h-11 w-11 overflow-hidden rounded-[10px] border-[2.5px] border-[#FFF7E8] bg-[#E7D9CD]">
        {current?.image_url && (
          <Image src={current.image_url} alt={current.name} fill className="object-cover" sizes="44px" />
        )}
      </div>
      <div className="absolute left-[18px] top-0 h-11 w-11 overflow-hidden rounded-[10px] border-[2.5px] border-[#FFF7E8] bg-[#E7D9CD]">
        {proposed.image_url && (
          <Image src={proposed.image_url} alt={proposed.name} fill className="object-cover" sizes="44px" />
        )}
      </div>
    </div>
  );
}

export function SwapSuggestionsBlock({
  familyId,
  ownerId,
  currentUserId,
  isOwner,
  className,
}: {
  familyId: string;
  ownerId: string;
  currentUserId: string;
  isOwner: boolean;
  className?: string;
}) {
  const { week, year } = getCurrentWeek();
  const [suggestions, setSuggestions] = useState<SwapSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const load = useCallback(async () => {
    const data = await fetchFamilySwapSuggestions(familyId, week, year);
    setSuggestions(data);
  }, [familyId, week, year]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    void load()
      .catch(() => { /* silent — don't break the dashboard */ })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [load]);

  const handleVote = async (suggestion: SwapSuggestion, yes: boolean) => {
    setPendingAction({ id: suggestion.id, action: yes ? "vote-yes" : "vote-no" });
    try {
      await voteOnRecipeSwapSuggestion(suggestion.id, yes);
      await load();
    } catch {
      toast.error("Couldn't record your vote.");
    } finally {
      setPendingAction(null);
    }
  };

  const handleApprove = async (suggestion: SwapSuggestion) => {
    setPendingAction({ id: suggestion.id, action: "approve" });
    try {
      await approveRecipeSwapSuggestion(suggestion.id, ownerId, week, year);
      await load();
    } catch {
      toast.error("Couldn't approve that suggestion.");
    } finally {
      setPendingAction(null);
    }
  };

  const handleDismiss = async (suggestion: SwapSuggestion) => {
    setPendingAction({ id: suggestion.id, action: "dismiss" });
    try {
      await dismissRecipeSwapSuggestion(suggestion.id);
      await load();
    } catch {
      toast.error("Couldn't dismiss that suggestion.");
    } finally {
      setPendingAction(null);
    }
  };

  if (loading) {
    return (
      <div className={className ?? "mx-5 mb-4"}>
        <Skeleton className="h-[64px] w-full rounded-[20px] bg-[#F0E8DE]" />
      </div>
    );
  }

  // Only surface suggestions where the current user has something to do:
  // - Suggester can't vote or approve their own suggestion → skip
  // - Owner only sees when votes exist: 0 votes means still gathering input,
  //   votes present means it's ready to commit
  // - Other members can always vote on suggestions from others
  const actionable = suggestions.filter((s) => {
    if (s.suggestedByUserId === currentUserId) return false;
    if (isOwner) return s.yesVotes + s.noVotes > 0;
    return true;
  });

  if (actionable.length === 0) return null;

  return (
    <div className={className ?? "mx-5 mb-4"}>
      <div className="space-y-2">
        {actionable.map((suggestion) => {
          const isOwnSuggestion = suggestion.suggestedByUserId === currentUserId;
          const isActive = pendingAction?.id === suggestion.id;
          const action = pendingAction?.action;

          const title = isOwnSuggestion
            ? "Your suggestion"
            : `${firstName(suggestion.suggestedByName)} suggested a swap`;

          const subtitle = [
            suggestion.currentRecipe?.name ?? "—",
            "→",
            suggestion.proposedRecipe.name,
            `· ${capitalize(suggestion.day)}`,
          ].join(" ");

          return (
            <div
              key={suggestion.id}
              className="flex items-center gap-3 rounded-[20px] bg-[#FFF7E8] px-4 py-3"
            >
              <RecipeThumbs
                current={suggestion.currentRecipe}
                proposed={suggestion.proposedRecipe}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#3A2A1F]">{title}</p>
                <p className="truncate text-xs text-[#6F5B4B]">{subtitle}</p>
              </div>

              {isOwnSuggestion ? (
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[#B08D52]">
                  Pending
                </span>
              ) : isOwner ? (
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleApprove(suggestion)}
                    disabled={isActive}
                    className="inline-flex items-center gap-1 rounded-full bg-[#7CB342] px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {isActive && action === "approve"
                      ? <Loader2 className="size-3 animate-spin" />
                      : <ThumbsUp className="size-3" />}
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDismiss(suggestion)}
                    disabled={isActive}
                    className="inline-flex items-center gap-1 rounded-full border border-[#D9CCBB] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3A2A1F] disabled:opacity-50"
                  >
                    {isActive && action === "dismiss"
                      ? <Loader2 className="size-3 animate-spin" />
                      : <ThumbsDown className="size-3" />}
                    Dismiss
                  </button>
                </div>
              ) : (
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleVote(suggestion, true)}
                    disabled={isActive}
                    className="inline-flex items-center gap-1 rounded-full bg-[#7CB342] px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {isActive && action === "vote-yes"
                      ? <Loader2 className="size-3 animate-spin" />
                      : <ThumbsUp className="size-3" />}
                    {suggestion.yesVotes > 0 ? suggestion.yesVotes : "Yes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleVote(suggestion, false)}
                    disabled={isActive}
                    className="inline-flex items-center gap-1 rounded-full border border-[#D9CCBB] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3A2A1F] disabled:opacity-50"
                  >
                    {isActive && action === "vote-no"
                      ? <Loader2 className="size-3 animate-spin" />
                      : <ThumbsDown className="size-3" />}
                    {suggestion.noVotes > 0 ? suggestion.noVotes : "No"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
