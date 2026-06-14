"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { WeekPreviewDay } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import type { Weekday } from "@/lib/recipeSchedule";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useState } from "react";

const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_TOLERANCE = 12;

type WeekPreviewCardsProps = {
  days: WeekPreviewDay[];
  onDayClick?: (recipeId: string) => void;
  onLongPressDay?: (day: Weekday, recipeId: string) => void;
  onSwapDays?: (dayA: Weekday, dayB: Weekday) => void;
  onViewFullWeek?: () => void;
  onBuildNextWeek?: () => void;
  isLoading?: boolean;
  className?: string;
  flat?: boolean;
};

// Long-press gesture: fires `onLongPress` if the pointer stays down without
// moving past the tolerance for LONG_PRESS_MS, and suppresses the follow-up
// click so it doesn't also trigger the regular tap action.
function useLongPress(onLongPress: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const clear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    startRef.current = null;
  };

  return {
    onPointerDown: (e: React.PointerEvent) => {
      firedRef.current = false;
      startRef.current = { x: e.clientX, y: e.clientY };
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const start = startRef.current;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE) clear();
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onClickCapture: (e: React.MouseEvent) => {
      if (firedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        firedRef.current = false;
      }
    },
  };
}

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

// ─── Static day card (no DnD) ────────────────────────────────────────────────

function DayCard({
  day,
  isLoading,
  cardRef,
  onDayClick,
  onLongPressDay,
}: {
  day: WeekPreviewDay;
  isLoading?: boolean;
  cardRef?: (el: HTMLButtonElement | null) => void;
  onDayClick?: (recipeId: string) => void;
  onLongPressDay?: (day: Weekday, recipeId: string) => void;
}) {
  const hasRecipe = Boolean(day.recipeId);

  let cardBorderClass = "border-dashed border-[#E8DCCB] bg-[#FAF6F2]";
  if (day.isCompleted) {
    cardBorderClass = "border-[#7CB342] bg-white";
  } else if (day.isToday) {
    cardBorderClass = "border-[#7CB342] bg-[#F0F9E8]";
  } else if (hasRecipe) {
    cardBorderClass = "border-transparent bg-white hover:border-[#D9CCBB]";
  }

  const longPress = useLongPress(() => {
    if (day.recipeId) onLongPressDay?.(day.day, day.recipeId);
  });

  return (
    <button
      ref={cardRef}
      onClick={() => day.recipeId && onDayClick?.(day.recipeId)}
      className={`flex-shrink-0 w-[120px] h-[220px] rounded-[22px] overflow-hidden border-2 flex flex-col justify-between transition-all ${cardBorderClass}`}
      type="button"
      disabled={isLoading || !hasRecipe}
      {...(hasRecipe && onLongPressDay ? longPress : null)}
    >
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
              className={`object-cover${day.isCompleted ? " opacity-60" : ""}`}
              sizes="120px"
            />
            {day.isCompleted && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7CB342]">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path d="M3.5 9.5L7 13L14.5 5.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-1 flex h-[140px] w-full items-center justify-center bg-[#F0E8DE]">
            <span className="text-xs font-medium text-[#B7A696]">Day off</span>
          </div>
        )}
      </div>
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
}

// ─── Draggable day card (with DnD) ───────────────────────────────────────────

function DraggableDayCard({
  day,
  isLoading,
  cardRef,
  onDayClick,
  activeDragDay,
}: {
  day: WeekPreviewDay;
  isLoading?: boolean;
  cardRef?: (el: HTMLButtonElement | null) => void;
  onDayClick?: (recipeId: string) => void;
  activeDragDay: string | null;
}) {
  const hasRecipe = Boolean(day.recipeId);

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: day.day });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: day.day });

  const setRef = useCallback(
    (el: HTMLButtonElement | null) => {
      setDragRef(el);
      setDropRef(el);
      if (cardRef) cardRef(el);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  let cardBorderClass = "border-dashed border-[#E8DCCB] bg-[#FAF6F2]";
  if (day.isCompleted) {
    cardBorderClass = "border-[#7CB342] bg-white";
  } else if (day.isToday) {
    cardBorderClass = "border-[#7CB342] bg-[#F0F9E8]";
  } else if (hasRecipe) {
    cardBorderClass = "border-transparent bg-white";
  }

  const isDropTarget = isOver && activeDragDay !== day.day;

  return (
    <button
      ref={setRef}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (hasRecipe && !isDragging) onDayClick?.(day.recipeId!);
      }}
      className={[
        "flex-shrink-0 w-[120px] h-[220px] rounded-[22px] overflow-hidden border-2 flex flex-col justify-between transition-all touch-none select-none cursor-grab active:cursor-grabbing",
        isDropTarget ? "!border-[#7CB342] bg-[#E7F6DF] scale-[1.04]" : cardBorderClass,
        isDragging ? "opacity-20" : "",
      ].join(" ")}
      type="button"
      disabled={isLoading || !hasRecipe}
    >
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
              className={`object-cover${day.isCompleted ? " opacity-60" : ""}`}
              sizes="120px"
            />
            {day.isCompleted && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7CB342]">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path d="M3.5 9.5L7 13L14.5 5.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-1 flex h-[140px] w-full items-center justify-center bg-[#F0E8DE]">
            <span className="text-xs font-medium text-[#B7A696]">Day off</span>
          </div>
        )}
      </div>
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
}

// Ghost shown in DragOverlay while dragging a card
function DayCardOverlay({ day }: { day: WeekPreviewDay }) {
  const hasRecipe = Boolean(day.recipeId);

  let cardBorderClass = "border-transparent bg-white";
  if (day.isCompleted) cardBorderClass = "border-[#7CB342] bg-white";
  else if (day.isToday) cardBorderClass = "border-[#7CB342] bg-[#F0F9E8]";

  return (
    <div
      className={[
        "flex-shrink-0 w-[120px] h-[220px] rounded-[22px] overflow-hidden border-2 flex flex-col justify-between",
        cardBorderClass,
        "shadow-2xl ring-4 ring-[#7CB342]/30 scale-[1.07]",
      ].join(" ")}
    >
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
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WeekPreviewCards({
  days,
  onDayClick,
  onLongPressDay,
  onSwapDays,
  onViewFullWeek,
  onBuildNextWeek,
  isLoading,
  className,
  flat,
}: WeekPreviewCardsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);

  // Local copy of days for optimistic DnD reordering
  const [localDays, setLocalDays] = useState<WeekPreviewDay[]>(days);
  const [activeDragDay, setActiveDragDay] = useState<string | null>(null);

  useEffect(() => {
    setLocalDays(days);
  }, [days]);

  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const card = todayRef.current;
      const offset = card.offsetLeft - container.offsetWidth / 2 + card.offsetWidth / 2;
      container.scrollTo({ left: offset, behavior: "smooth" });
    }
  }, [localDays]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragDay(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragDay(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const srcDay = String(active.id) as Weekday;
      const dstDay = String(over.id) as Weekday;

      // Optimistic swap of recipe data between the two slots
      const srcEntry = localDays.find((d) => d.day === srcDay);
      const dstEntry = localDays.find((d) => d.day === dstDay);
      if (!srcEntry || !dstEntry) return;

      const newDays = localDays.map((d) => {
        if (d.day === srcDay) {
          return {
            ...d,
            recipeId: dstEntry.recipeId,
            recipeName: dstEntry.recipeName,
            recipeImage: dstEntry.recipeImage,
            difficulty: dstEntry.difficulty,
            isCompleted: dstEntry.isCompleted,
          };
        }
        if (d.day === dstDay) {
          return {
            ...d,
            recipeId: srcEntry.recipeId,
            recipeName: srcEntry.recipeName,
            recipeImage: srcEntry.recipeImage,
            difficulty: srcEntry.difficulty,
            isCompleted: srcEntry.isCompleted,
          };
        }
        return d;
      });
      setLocalDays(newDays);

      onSwapDays?.(srcDay, dstDay);
    },
    [localDays, onSwapDays],
  );

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

  if (!localDays || localDays.length === 0) return null;

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

  const activeDayEntry = activeDragDay ? localDays.find((d) => d.day === activeDragDay) : null;

  const renderCards = () => {
    if (onSwapDays) {
      return localDays.map((day) => (
        <DraggableDayCard
          key={day.day}
          day={day}
          isLoading={isLoading}
          cardRef={day.isToday ? (el) => { todayRef.current = el; } : undefined}
          onDayClick={onDayClick}
          activeDragDay={activeDragDay}
        />
      ));
    }
    return localDays.map((day) => (
      <DayCard
        key={day.day}
        day={day}
        isLoading={isLoading}
        cardRef={day.isToday ? (el) => { todayRef.current = el; } : undefined}
        onDayClick={onDayClick}
        onLongPressDay={onLongPressDay}
      />
    ));
  };

  const scrollContent = (
    <>
      {renderCards()}
      {endOfWeekCard}
    </>
  );

  const inner = flat ? (
    <div className="overflow-hidden rounded-[16px]">
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {scrollContent}
      </div>
    </div>
  ) : (
    <div className="relative -mx-5">
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-9 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-white to-transparent" />
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-5 [scroll-padding-inline:1.25rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {scrollContent}
      </div>
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

      {onSwapDays ? (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {inner}
          <DragOverlay dropAnimation={null}>
            {activeDayEntry && <DayCardOverlay day={activeDayEntry} />}
          </DragOverlay>
        </DndContext>
      ) : (
        inner
      )}
    </div>
  );
}
