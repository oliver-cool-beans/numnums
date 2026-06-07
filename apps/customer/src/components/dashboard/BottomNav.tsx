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
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E7D9CD] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(58,42,31,0.06)] backdrop-blur-md md:hidden">
      <div className="mx-auto flex w-full max-w-[390px] items-center justify-around px-2 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
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
                <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
