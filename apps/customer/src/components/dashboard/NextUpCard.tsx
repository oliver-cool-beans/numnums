"use client";

import { CalendarDays, ChevronRight } from "lucide-react";

type NextUpCardProps = {
  nextRecipeName: string | null;
  onViewNext?: () => void;
  className?: string;
};

export function NextUpCard({ nextRecipeName, onViewNext, className }: NextUpCardProps) {
  if (!nextRecipeName) return null;

  return (
    <div className={className ?? "mx-5 mb-4 flex items-center justify-between rounded-[20px] bg-white p-4 shadow-sm"}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E0F2E0]">
          <CalendarDays aria-hidden="true" className="h-5 w-5 text-[#3A2A1F]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#3A2A1F]">Next up</p>
          <p className="text-xs text-[#6F5B4B]">{nextRecipeName} tomorrow</p>
        </div>
      </div>
      <button
        onClick={onViewNext}
        className="flex-shrink-0 text-[#6F5B4B] hover:text-[#3A2A1F] transition-colors"
        type="button"
      >
        <ChevronRight aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
  );
}
