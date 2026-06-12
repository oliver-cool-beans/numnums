"use client";

import { useState } from "react";
import { ShoppingList } from "@/lib/hooks";
import { Check, Loader2, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type ShoppingListCardProps = {
  list: ShoppingList | null;
  hasMealPlan?: boolean;
  onViewList?: () => void;
  onReviewList?: () => void;
  isLoading?: boolean;
  className?: string;
};

function draftLabel(isDraft: boolean, hasMealPlan: boolean | undefined): string {
  if (isDraft) return "Your list is ready to review";
  if (hasMealPlan) return "Tap to build your list";
  return "Plan your week to generate a list";
}

function draftCta(isDraft: boolean, hasMealPlan: boolean | undefined): string {
  if (isDraft) return "Review";
  if (hasMealPlan) return "Start";
  return "Plan";
}

function DraftCard({
  isDraft,
  hasMealPlan,
  isLoading,
  onReviewList,
}: {
  isDraft: boolean;
  hasMealPlan: boolean | undefined;
  isLoading: boolean | undefined;
  onReviewList: (() => void) | undefined;
}) {
  const [isNavigating, setIsNavigating] = useState(false);
  const noListYet = !isDraft && !hasMealPlan;
  const pending = isNavigating || isLoading;

  const handleClick = () => {
    if (!onReviewList || noListYet) return;
    setIsNavigating(true);
    onReviewList();
  };

  return (
    <button
      onClick={handleClick}
      disabled={pending || noListYet}
      className="flex w-full items-center justify-between rounded-[20px] bg-[#FFE7A3] p-4 text-left transition-colors hover:bg-[#FFE093] disabled:opacity-50"
      type="button"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFC850]">
          <ShoppingCart aria-hidden="true" className="h-5 w-5 text-[#3A2A1F]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#3A2A1F]">Shopping list</p>
          <p className="text-xs text-[#8B7355]">{draftLabel(isDraft, hasMealPlan)}</p>
        </div>
      </div>
      <span className="flex-shrink-0 text-sm font-semibold text-[#3A2A1F]">
        {isNavigating ? <Loader2 className="size-4 animate-spin" /> : draftCta(isDraft, hasMealPlan)}
      </span>
    </button>
  );
}

function ConfirmedCard({
  isCompleted,
  isLoading,
  onViewList,
}: {
  isCompleted: boolean;
  isLoading: boolean | undefined;
  onViewList: (() => void) | undefined;
}) {
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = () => {
    if (!onViewList) return;
    setIsNavigating(true);
    onViewList();
  };

  return (
    <button
      onClick={handleClick}
      disabled={isNavigating || isLoading}
      className="flex w-full items-center justify-between rounded-[20px] bg-[#FFE7A3] p-4 text-left transition-colors hover:bg-[#FFE093] disabled:opacity-50"
      type="button"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7CB342]">
          <Check aria-hidden="true" className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#3A2A1F]">
            {isCompleted ? "Shopping done" : "You're all set"}
          </p>
          <p className="text-xs text-[#8B7355]">
            {isCompleted ? "Great shopping!" : "We've added everything to your list."}
          </p>
        </div>
      </div>
      <span className="flex-shrink-0 text-sm font-semibold text-[#3A2A1F]">
        {isNavigating ? <Loader2 className="size-4 animate-spin" /> : "View"}
      </span>
    </button>
  );
}

export function ShoppingListCard({
  list,
  hasMealPlan,
  onViewList,
  onReviewList,
  isLoading,
  className,
}: ShoppingListCardProps) {
  const wrapperClass = className ?? "mx-5 mb-4";
  const isDraft = list?.status === "draft";
  const isConfirmed = list?.status === "confirmed";
  const isCompleted = list?.status === "completed";

  if (isLoading && !list) {
    return (
      <div className={wrapperClass}>
        <div className="flex items-center gap-4 rounded-[24px] bg-[#FFF7E8] px-5 py-5">
          <Skeleton className="h-12 w-12 shrink-0 rounded-full bg-[#F0E8DE]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40 bg-[#F0E8DE]" />
            <Skeleton className="h-3 w-28 bg-[#F0E8DE]" />
          </div>
        </div>
      </div>
    );
  }

  if (!list || isDraft) {
    return (
      <div className={wrapperClass}>
        <DraftCard isDraft={isDraft} hasMealPlan={hasMealPlan} isLoading={isLoading} onReviewList={onReviewList} />
      </div>
    );
  }

  if (isConfirmed || isCompleted) {
    return (
      <div className={wrapperClass}>
        <ConfirmedCard isCompleted={isCompleted} isLoading={isLoading} onViewList={onViewList} />
      </div>
    );
  }

  return null;
}
