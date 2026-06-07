"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { WeekPreviewDay } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";

type WeekPreviewCardsProps = {
  days: WeekPreviewDay[];
  onDayClick?: (recipeId: string) => void;
  onViewFullWeek?: () => void;
  onBuildNextWeek?: () => void;
  isLoading?: boolean;
  className?: string;
  flat?: boolean;
};

function difficultyColor(difficulty: number | string | null): string {
  if (typeof difficulty === "number") {
    if (difficulty <= 2) return "#6BC98A";
    if (difficulty <= 4) return "#F4B942";
    return "#E85D5D";
  }
  switch (difficulty?.toLowerCase()) {
    case "easy": return "#6BC98A";
    case "medium": return "#F4B942";
    case "hard": return "#E85D5D";
    default: return "#6BC98A";
  }
}

export function WeekPreviewCards({
  days,
  onDayClick,
  onViewFullWeek,
  onBuildNextWeek,
  isLoading,
  className,
  flat,
}: WeekPreviewCardsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const card = todayRef.current;
      const offset = card.offsetLeft - container.offsetWidth / 2 + card.offsetWidth / 2;
      container.scrollTo({ left: offset, behavior: "smooth" });
    }
  }, [days]);

  if (isLoading && (!days || days.length === 0)) {
    return (
      <div className={className ?? "mx-5 mb-4 space-y-3"}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#3A2A1F]">Your week</h3>
        </div>
        <div className={flat ? "flex gap-3 overflow-hidden" : "-mx-5 flex gap-3 overflow-hidden px-5"}>
          {["mon", "tue", "wed", "thu"].map((key) => (
            <Skeleton key={key} className="h-[220px] w-[120px] shrink-0 rounded-[22px] bg-[#F0E8DE]" />
          ))}
        </div>
      </div>
    );
  }

  if (!days || days.length === 0) return null;

  const dayCards = days.map((day) => {
    const hasRecipe = Boolean(day.recipeId);

    let cardBorderClass = "border-dashed border-[#E8DCCB] bg-[#FAF6F2]";
    if (day.isToday) {
      cardBorderClass = "border-[#7CB342] bg-[#F0F9E8]";
    } else if (hasRecipe) {
      cardBorderClass = "border-transparent bg-white hover:border-[#D9CCBB]";
    }

    return (
      <button
        key={day.day}
        ref={day.isToday ? todayRef : undefined}
        onClick={() => day.recipeId && onDayClick?.(day.recipeId)}
        className={`flex-shrink-0 w-[120px] h-[220px] rounded-[22px] overflow-hidden border-2 flex flex-col justify-between transition-all ${cardBorderClass}`}
        type="button"
        disabled={isLoading || !hasRecipe}
      >
        {/* Top group: day label + image */}
        <div className="shrink-0">
          <p className="px-2.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[#6F5B4B]">
            {day.dayLabel}
          </p>
          {hasRecipe ? (
            <div className="relative mt-1 h-[140px] w-full bg-[#E7D9CD]">
              <Image
                src={day.recipeImage ?? "/pot-angle.png"}
                alt={day.recipeName ?? ""}
                fill
                className="object-cover"
                sizes="120px"
              />
            </div>
          ) : (
            <div className="mt-1 flex h-[140px] w-full items-center justify-center bg-[#F0E8DE]">
              <span className="text-xs font-medium text-[#B7A696]">Day off</span>
            </div>
          )}
        </div>

        {/* Bottom group: recipe name + difficulty bar — always pinned to bottom */}
        <div className="shrink-0 px-2.5 pb-2.5">
          {hasRecipe && (
            <>
              <p className="text-[11px] font-medium line-clamp-2 text-left leading-tight text-[#3A2A1F]">
                {day.recipeName}
              </p>
              <div
                className="mt-1.5 h-[3px] w-full rounded-full"
                style={{ backgroundColor: difficultyColor(day.difficulty) }}
              />
            </>
          )}
        </div>
      </button>
    );
  });

  const endOfWeekCard = (
    <div
      key="end-of-week"
      className="flex w-[120px] h-[220px] shrink-0 flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-[#E8DCCB] bg-[#FAF6F2] px-3 text-center"
    >
      <p className="text-sm font-semibold text-[#3A2A1F]">That&apos;s It!</p>
      <p className="text-[11px] leading-tight text-[#6F5B4B]">Keep the good meals coming next week.</p>
      <button
        onClick={onBuildNextWeek}
        className="mt-1 text-[11px] font-medium text-[#7CB342] underline underline-offset-2 transition-colors hover:text-[#558B2F]"
        type="button"
      >
        Build next week →
      </button>
    </div>
  );

  return (
    <div className={className ?? "mx-5 mb-4 space-y-3"}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#3A2A1F]">Your week</h3>
        <button
          onClick={onViewFullWeek}
          className="text-sm font-medium text-[#7CB342] hover:text-[#558B2F] transition-colors"
          type="button"
        >
          View full week
        </button>
      </div>

      {flat ? (
        // Desktop: contained scroll, no bleed outside column
        <div className="overflow-hidden rounded-[16px]">
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {dayCards}
            {endOfWeekCard}
          </div>
        </div>
      ) : (
        // Mobile: full-bleed scroll with edge fades that respect the page padding
        <div className="relative -mx-5">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-9 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-white to-transparent" />
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto px-5 [scroll-padding-inline:1.25rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {dayCards}
            {endOfWeekCard}
          </div>
        </div>
      )}
    </div>
  );
}
