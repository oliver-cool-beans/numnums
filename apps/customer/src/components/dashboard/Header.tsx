"use client";

import { useEffect, useRef, useState } from "react";
import { CurrentUser } from "@/lib/hooks";

type HeaderProps = {
  user: CurrentUser | null;
  onAvatarClick?: () => void;
  onSignOut?: () => void;
  compact?: boolean;
};

export function Header({ user, onAvatarClick, onSignOut, compact }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const avatarButton = (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E7D9CD] text-center text-sm font-semibold text-[#3A2A1F] hover:bg-[#D9CCBB] transition-colors"
        type="button"
        aria-label="Profile menu"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        {user?.name?.charAt(0).toUpperCase() || "U"}
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-52 rounded-lg bg-white shadow-lg border border-[#E7D9CD] overflow-hidden z-50"
        >
          <div className="px-4 py-3 border-b border-[#E7D9CD]">
            <p className="text-sm font-semibold text-[#3A2A1F] truncate">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-[#6F5B4B] truncate">{user?.email}</p>
          </div>
          <button
            role="menuitem"
            className="w-full text-left px-4 py-3 text-sm text-[#3A2A1F] hover:bg-[#F5EDE6] transition-colors"
            onClick={() => {
              setMenuOpen(false);
              onAvatarClick?.();
            }}
          >
            Profile
          </button>
          <button
            role="menuitem"
            className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-[#F5EDE6] transition-colors"
            onClick={() => {
              setMenuOpen(false);
              onSignOut?.();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );

  if (compact) {
    return avatarButton;
  }

  return (
    <header className="flex w-full items-center justify-between px-5 pt-6 pb-2">
      <p className="text-[28px] font-semibold leading-none tracking-[-0.02em] text-[#3A2A1F] md:hidden">
        numnums
      </p>
      {avatarButton}
    </header>
  );
}
