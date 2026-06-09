"use client";

import { CalendarDays, Heart, LogOut, ShoppingCart } from "lucide-react";
import type { AuthUser } from "@/lib/auth-context";

type SideNavProps = {
  activeTab?: "week" | "list" | "favorites" | "profile";
  onTabChange?: (tab: "week" | "list" | "favorites" | "profile") => void;
  user?: AuthUser | null;
  onSignOut?: () => void;
};

export function SideNav({ activeTab = "week", onTabChange, user, onSignOut }: SideNavProps) {
  const tabs = [
    { id: "week", label: "My Week", icon: CalendarDays },
    { id: "list", label: "List", icon: ShoppingCart },
    { id: "favorites", label: "Favorites", icon: Heart },
  ] as const;

  return (
    <nav className="hidden md:flex flex-col w-[220px] shrink-0 bg-[#FAF7F4] px-4 py-8">
      <p className="mb-8 px-3 text-[36px] font-semibold leading-none tracking-[-0.02em] text-[#3A2A1F]">
        numnums
      </p>
      <div className="flex flex-col gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={`flex items-center gap-3 rounded-[14px] px-3 py-3 text-left transition-all ${
                isActive
                  ? "bg-[#F1F8E8] text-[#5FA66B]"
                  : "text-[#9E8B7E] hover:bg-[#FAF5EE] hover:text-[#6F5B4B]"
              }`}
              type="button"
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* User section pinned to bottom */}
      {user && (
        <div className="mt-auto border-t border-[#E7D9CD] pt-4">
          <div className="flex items-center gap-3 rounded-[14px] px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7D9CD] text-sm font-semibold text-[#3A2A1F]">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#3A2A1F]">{user.name}</p>
              <p className="truncate text-xs text-[#6F5B4B]">{user.email}</p>
            </div>
            <button
              onClick={onSignOut}
              className="shrink-0 text-[#9E8B7E] transition-colors hover:text-[#3A2A1F]"
              type="button"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
