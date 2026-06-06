"use client";

import { CalendarDays, Heart, ShoppingCart, UserRound } from "lucide-react";

type BottomNavProps = {
  activeTab?: "week" | "list" | "favorites" | "profile";
  onTabChange?: (tab: "week" | "list" | "favorites" | "profile") => void;
};

export function BottomNav({ activeTab = "week", onTabChange }: BottomNavProps) {
  const tabs = [
    { id: "week", label: "My Week", icon: CalendarDays },
    { id: "list", label: "List", icon: ShoppingCart },
    { id: "favorites", label: "Favorites", icon: Heart },
    { id: "profile", label: "Profile", icon: UserRound },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E7D9CD] bg-white pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3 shadow-[0_-12px_32px_rgba(58,42,31,0.08)] backdrop-blur-md md:hidden">
      <div className="mx-auto flex w-full max-w-[390px] items-end justify-around px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={`relative flex flex-1 flex-col items-center gap-1 rounded-[20px] px-3 py-2 transition-all ${
                isActive
                  ? "text-[#3A2A1F]"
                  : "text-[#9E8B7E] hover:text-[#6F5B4B]"
              }`}
              type="button"
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                  isActive
                    ? "border-[#DDEDC8] bg-[#F1F8E8] text-[#5FA66B] shadow-[0_4px_12px_rgba(95,166,107,0.16)]"
                    : "border-transparent bg-white/50 text-current"
                }`}
              >
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="text-xs font-medium leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
