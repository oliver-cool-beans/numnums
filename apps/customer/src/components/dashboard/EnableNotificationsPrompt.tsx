"use client";

import { useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPushPermissionState,
  isInstalledOnIOS,
  subscribeToPush,
} from "@/lib/pushNotifications";
import { toast } from "@/lib/toast";

type EnableNotificationsPromptProps = {
  userId: string;
  title: string;
  message: string;
  onDismiss: () => void;
  className?: string;
};

/**
 * A "soft ask" shown at a meaningful moment, before the native permission
 * prompt — declining this costs nothing, but the native prompt is one-shot.
 */
export function EnableNotificationsPrompt({ userId, title, message, onDismiss, className }: EnableNotificationsPromptProps) {
  const [isEnabling, setIsEnabling] = useState(false);

  if (getPushPermissionState() !== "default") return null;

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      if (isInstalledOnIOS()) {
        toast.error("Add NumNums to your home screen first, then enable notifications from there.");
        return;
      }
      await subscribeToPush(userId);
      onDismiss();
    } catch (subscribeError) {
      toast.error(subscribeError instanceof Error ? subscribeError.message : "We couldn't enable notifications.");
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <div className={className ?? "mx-5 mb-4 rounded-[24px] border border-[#E8DCCB] bg-white px-4 py-4 shadow-[0_4px_20px_rgba(58,42,31,0.06)]"}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F4FFE8] text-[#689F38]">
          <Bell className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#3A2A1F]">{title}</p>
          <p className="mt-0.5 text-xs leading-4 text-[#6F5B4B]">{message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-[#9E8B7E] transition-colors hover:bg-[#F5EDE0]"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-3 flex gap-2.5">
        <Button
          variant="outline"
          className="h-10 flex-1 rounded-full border-[#D9CCBB] bg-white text-sm text-[#3A2A1F]"
          onClick={onDismiss}
          disabled={isEnabling}
        >
          Not now
        </Button>
        <Button
          className="h-10 flex-1 rounded-full bg-[#7CB342] text-sm text-white hover:bg-[#689F38]"
          onClick={() => void handleEnable()}
          disabled={isEnabling}
        >
          {isEnabling ? "Enabling..." : "Enable notifications"}
        </Button>
      </div>
    </div>
  );
}
