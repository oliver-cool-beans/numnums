"use client";

import { ShoppingList } from "@/lib/hooks";
import { Check, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type ShoppingListCardProps = {
  list: ShoppingList | null;
  onViewList?: () => void;
  onReviewList?: () => void;
  onDoLater?: () => void;
  isLoading?: boolean;
  className?: string;
};

export function ShoppingListCard({
  list,
  onViewList,
  onReviewList,
  onDoLater,
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
        <button
          onClick={onReviewList}
          disabled={isLoading}
          className="w-full rounded-[24px] bg-[#FFC850] px-5 py-5 text-left transition-all hover:bg-[#FFB834] active:scale-[0.98] disabled:opacity-50"
          type="button"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFE7A3]">
              <ShoppingCart aria-hidden="true" className="h-6 w-6 text-[#3A2A1F]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold text-[#3A2A1F]">Complete shopping list</p>
              <p className="text-sm text-[#8B7355]">
                {isDraft ? "Your list is ready to review" : "Tap to build your list"}
              </p>
            </div>
          </div>
        </button>
      </div>
    );
  }

  if (isConfirmed || isCompleted) {
    return (
      <div className={wrapperClass}>
        <button
          onClick={onViewList}
          disabled={isLoading}
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
                {isCompleted
                  ? "Great shopping!"
                  : "We've added everything to your list."}
              </p>
            </div>
          </div>
          <span className="flex-shrink-0 text-sm font-semibold text-[#3A2A1F]">
            View
          </span>
        </button>
      </div>
    );
  }

  return null;
}
