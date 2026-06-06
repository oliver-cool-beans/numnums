"use client";

import { Lightbulb } from "lucide-react";

type SwapCardProps = {
  isVisible?: boolean;
  onSwap?: () => void;
  className?: string;
};

export function SwapCard({ isVisible = true, onSwap, className }: SwapCardProps) {
  if (!isVisible) return null;

  return (
    <div className={className ?? "mx-5 mb-4 flex items-center justify-between rounded-[20px] bg-white p-4 shadow-sm"}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8D9F0]">
          <Lightbulb aria-hidden="true" className="h-5 w-5 text-[#3A2A1F]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#3A2A1F]">Want a swap?</p>
          <p className="text-xs text-[#6F5B4B]">Change Friday&apos;s dinner before we build your list.</p>
        </div>
      </div>
      <button
        onClick={onSwap}
        className="flex-shrink-0 rounded-full bg-[#E8D9F0] px-3 py-1 text-xs font-semibold text-[#3A2A1F] hover:bg-[#DCC9E8] transition-colors"
        type="button"
      >
        Swap
      </button>
    </div>
  );
}
