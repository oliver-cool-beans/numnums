"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { WeekPreviewDay } from "@/lib/hooks";

type WeekPreviewCardsProps = {
  days: WeekPreviewDay[];
  onDayClick?: (recipeId: string) => void;
  onViewFullWeek?: () => void;
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

  if (!days || days.length === 0) return null;

  const dayCards = days.map((day) => (
    <button
      key={day.day}
      ref={day.isToday ? todayRef : undefined}
      onClick={() => day.recipeId && onDayClick?.(day.recipeId)}
      className={`flex-shrink-0 w-[120px] h-[220px] rounded-[22px] overflow-hidden border-2 flex flex-col justify-between transition-all ${
        day.isToday
          ? "border-[#7CB342] bg-[#F0F9E8]"
          : "border-transparent bg-white hover:border-[#D9CCBB]"
      }`}
      type="button"
      disabled={isLoading}
    >
      {/* Top group: day label + image */}
      <div className="shrink-0">
        <p className="px-2.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[#6F5B4B]">
          {day.dayLabel}
        </p>
        <div className="relative mt-1 h-[140px] w-full bg-[#E7D9CD]">
          <Image
            src={day.recipeImage ?? "/pot-angle.png"}
            alt={day.recipeName}
            fill
            className="object-cover"
            sizes="120px"
          />
        </div>
      </div>

      {/* Bottom group: recipe name + difficulty bar — always pinned to bottom */}
      <div className="shrink-0 px-2.5 pb-2.5">
        <p className="text-[11px] font-medium text-[#3A2A1F] line-clamp-2 text-left leading-tight">
          {day.recipeName}
        </p>
        <div
          className="mt-1.5 h-[3px] w-full rounded-full"
          style={{ backgroundColor: difficultyColor(day.difficulty) }}
        />
      </div>
    </button>
  ));

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
          </div>
        </div>
      ) : (
        // Mobile: full-bleed scroll with right-edge fade
        <div className="relative -mx-5">
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-white to-transparent" />
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {dayCards}
          </div>
        </div>
      )}
    </div>
  );
}
