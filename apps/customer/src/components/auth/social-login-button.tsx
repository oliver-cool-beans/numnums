"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type SocialLoginButtonProps = {
  label: string;
  logo: ReactNode;
  onClick: () => Promise<void> | void;
  className?: string;
  disabled?: boolean;
};

export function SocialLoginButton({
  label,
  logo,
  onClick,
  className,
  disabled = false,
}: SocialLoginButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    if (disabled || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onClick();
    } catch {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isSubmitting}
      className={cn(
        "splash-button relative h-16 w-full rounded-full bg-[#1877F2] text-[20px] font-semibold text-white shadow-[0_4px_0_rgba(58,42,31,0.08)] transition-colors active:bg-[#165FD8] disabled:cursor-not-allowed disabled:opacity-90",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center gap-3 transition-opacity duration-250",
          isSubmitting ? "opacity-0" : "opacity-100",
        )}
      >
        {logo}
        <span>{label}</span>
      </span>

      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-250",
          isSubmitting ? "opacity-100" : "opacity-0",
        )}
      >
        <span className="animate-pulse">{logo}</span>
      </span>
    </button>
  );
}
