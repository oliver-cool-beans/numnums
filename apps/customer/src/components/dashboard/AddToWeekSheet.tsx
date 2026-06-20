"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { getDayOfWeek, getCurrentWeek, getWeekAtOffset } from "@/lib/utils";
import type { Weekday } from "@/lib/recipeSchedule";

const DAYS: { day: Weekday; label: string }[] = [
  { day: "monday", label: "Mon" },
  { day: "tuesday", label: "Tue" },
  { day: "wednesday", label: "Wed" },
  { day: "thursday", label: "Thu" },
  { day: "friday", label: "Fri" },
];

type AddToWeekSheetProps = {
  recipeName: string;
  onAdd: (day: Weekday, week: number, year: number) => void;
  onClose: () => void;
};

export function AddToWeekSheet({ recipeName, onAdd, onClose }: AddToWeekSheetProps) {
  // Thu (4), Fri (5), Sat (6), Sun (0) → default to next week
  const dow = getDayOfWeek();
  const defaultNext = dow === 0 || dow >= 4;
  const [useNextWeek, setUseNextWeek] = useState(defaultNext);

  const thisWeek = getCurrentWeek();
  const nextWeek = getWeekAtOffset(1);
  const { week, year } = useNextWeek ? nextWeek : thisWeek;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 md:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[390px] rounded-t-[28px] bg-white p-5 pb-8 shadow-[0_-8px_40px_rgba(58,42,31,0.16)] md:max-w-[360px] md:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9E8B7E]">Add to week</p>
            <p className="truncate text-sm font-semibold text-[#3A2A1F]">{recipeName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#9E8B7E] transition-colors hover:bg-[#FAF6F2]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Week toggle */}
        <div className="mt-4 flex rounded-full border border-[#E8DCCB] bg-[#FAF6F2] p-1">
          <button
            type="button"
            onClick={() => setUseNextWeek(false)}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors ${
              !useNextWeek ? "bg-white text-[#3A2A1F] shadow-sm" : "text-[#9E8B7E]"
            }`}
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => setUseNextWeek(true)}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors ${
              useNextWeek ? "bg-white text-[#3A2A1F] shadow-sm" : "text-[#9E8B7E]"
            }`}
          >
            Next week
          </button>
        </div>

        {/* Day buttons */}
        <div className="mt-4 flex gap-2">
          {DAYS.map(({ day, label }) => (
            <button
              key={day}
              type="button"
              onClick={() => { onAdd(day, week, year); onClose(); }}
              className="flex-1 rounded-[16px] border border-[#E8DCCB] bg-white py-3 text-center text-sm font-semibold text-[#3A2A1F] transition-colors hover:border-[#7CB342] hover:bg-[#F0F9E8]"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
