"use client";

import { useState } from "react";
import { CalendarDays, Loader2, ShoppingCart, UserRound } from "lucide-react";

type BottomNavProps = {
  activeTab?: "week" | "list" | "profile";
  onTabChange?: (tab: "week" | "list" | "profile") => void;
};

export function BottomNav({ activeTab = "week", onTabChange }: BottomNavProps) {
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  const tabs = [
    { id: "week", label: "My Week", icon: CalendarDays },
    { id: "list", label: "List", icon: ShoppingCart },
    { id: "profile", label: "Profile", icon: UserRound },
  ] as const;

  const handleTabClick = (id: "week" | "list" | "profile") => {
    if (id !== "week") setPendingTab(id);
    onTabChange?.(id);
  };

  return (
    <nav className="relative z-20 shrink-0 border-t border-[#E7D9CD] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(58,42,31,0.06)] backdrop-blur-md md:hidden">
      <div className="mx-auto flex w-full max-w-[390px] items-center justify-around px-2 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isSpinning = pendingTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1 transition-colors ${
                isActive
                  ? "text-[#5FA66B]"
                  : "text-[#9E8B7E] active:text-[#6F5B4B]"
              }`}
              type="button"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  isActive ? "bg-[#F1F8E8]" : "bg-transparent"
                }`}
              >
                {isSpinning
                  ? <Loader2 aria-hidden="true" className="h-[18px] w-[18px] animate-spin" />
                  : <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                }
              </span>
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
