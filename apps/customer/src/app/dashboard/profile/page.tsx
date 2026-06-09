"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Switch } from "@/components/ui/switch";
import { DIETARY_OPTIONS, fetchDietaryPreferences, saveDietaryPreferences } from "@/lib/dietaryPreferences";
import {
  fetchNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notificationPreferences";
import { getPushPermissionState, isInstalledOnIOS, subscribeToPush, unsubscribeFromPush } from "@/lib/pushNotifications";

function optionLabel(id: string) {
  return DIETARY_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [saved, setSavedPreferences] = useState<string[]>([]);
  const [draft, setDraft] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [updatingChannel, setUpdatingChannel] = useState<"push" | "email" | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    fetchDietaryPreferences(user.id)
      .then((preferences) => {
        if (isMounted) setSavedPreferences(preferences);
      })
      .catch((fetchError) => {
        if (isMounted) setError(fetchError instanceof Error ? fetchError.message : "We couldn't load your preferences.");
      })
      .finally(() => {
        if (isMounted) setLoadingPreferences(false);
      });
    return () => { isMounted = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    fetchNotificationPreferences(user.id)
      .then((preferences) => {
        if (isMounted) setNotificationPreferences(preferences);
      })
      .catch((fetchError) => {
        if (isMounted) {
          setNotificationError(
            fetchError instanceof Error ? fetchError.message : "We couldn't load your notification settings.",
          );
        }
      });
    return () => { isMounted = false; };
  }, [user?.id]);

  const handleTogglePush = async (next: boolean) => {
    if (!user?.id || updatingChannel) return;
    setNotificationError(null);
    setUpdatingChannel("push");
    const previous = notificationPreferences;
    setNotificationPreferences((current) => (current ? { ...current, pushEnabled: next } : current));

    try {
      if (next) {
        if (isInstalledOnIOS()) {
          throw new Error("Add NumNums to your home screen first, then enable notifications from there.");
        }
        if (getPushPermissionState() === "denied") {
          throw new Error("Notifications are blocked for this site — enable them in your browser settings first.");
        }
        const granted = await subscribeToPush(user.id);
        if (!granted) {
          setNotificationPreferences(previous);
          return;
        }
      } else {
        await unsubscribeFromPush(user.id);
      }
    } catch (toggleError) {
      setNotificationPreferences(previous);
      setNotificationError(
        toggleError instanceof Error ? toggleError.message : "We couldn't update your push notification setting.",
      );
    } finally {
      setUpdatingChannel(null);
    }
  };

  const handleToggleEmail = async (next: boolean) => {
    if (!user?.id || updatingChannel) return;
    setNotificationError(null);
    setUpdatingChannel("email");
    const previous = notificationPreferences;
    setNotificationPreferences((current) => (current ? { ...current, emailEnabled: next } : current));

    try {
      await saveNotificationPreferences(user.id, { emailEnabled: next });
    } catch (toggleError) {
      setNotificationPreferences(previous);
      setNotificationError(
        toggleError instanceof Error ? toggleError.message : "We couldn't update your email setting.",
      );
    } finally {
      setUpdatingChannel(null);
    }
  };

  if (loading) {
    return <LoadingScreen title="Profile" message="Just a moment..." />;
  }

  const startEditing = () => {
    setError(null);
    setDraft(saved);
    setIsEditing(true);
  };

  const toggle = (id: string) => {
    setDraft((current) => (current.includes(id) ? current.filter((v) => v !== id) : [...current, id]));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    setError(null);
    try {
      await saveDietaryPreferences(user.id, draft);
      setSavedPreferences(draft);
      setIsEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We couldn't save your preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col bg-white md:min-h-0 md:max-w-[600px] md:rounded-[28px] md:shadow-[0_4px_40px_rgba(58,42,31,0.10)] md:overflow-hidden">
      <header className="flex items-center gap-3 px-5 pb-3 pt-14">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#3A2A1F] shadow-sm transition-colors hover:bg-[#F5EDE0]"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-[#3A2A1F]">Profile</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-10">
        <h2 className="text-base font-semibold text-[#3A2A1F]">Dietary preferences</h2>
        <p className="mt-1 text-sm leading-5 text-[#6F5B4B]">
          We&apos;ll use these to filter and prioritize your recipe picks each week.
        </p>

        {loadingPreferences ? (
          <p className="mt-4 px-1 text-sm text-[#9E8B7E]">Loading...</p>
        ) : isEditing ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {DIETARY_OPTIONS.map((option) => {
                const isSelected = draft.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggle(option.id)}
                    className={cn(
                      "relative min-h-[92px] rounded-[24px] border bg-white px-3 py-3 text-left transition-all",
                      isSelected
                        ? "border-[#7CB342] shadow-[0_12px_30px_rgba(124,179,66,0.18)]"
                        : "border-[#E8DCCB] hover:-translate-y-0.5 hover:border-[#7CB342]/60",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute right-2 top-2 flex size-7 items-center justify-center rounded-full border bg-white transition-colors",
                        isSelected
                          ? "border-[#689F38] bg-[#F4FFE8] text-[#689F38] shadow-sm"
                          : "border-[#D9CCBB] text-transparent",
                      )}
                    >
                      <Check className="size-4" />
                    </span>
                    <div className="pr-8">
                      <p className="text-sm font-semibold leading-5 text-[#3A2A1F]">{option.label}</p>
                      <p className="mt-1 text-[0.68rem] leading-4 text-[#6F5B4B]">
                        {isSelected ? "Included in picks" : "Tap to include"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex gap-2.5">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-full border-[#D9CCBB] bg-white text-[#3A2A1F]"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                className="h-11 flex-1 rounded-full bg-[#7CB342] text-white hover:bg-[#689F38]"
                onClick={() => void handleSave()}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save preferences"}
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-[24px] border border-[#E8DCCB] bg-white px-4 py-4">
            {saved.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {saved.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#7CB342]/40 bg-[#F4FFE8] px-3 py-1.5 text-xs font-semibold text-[#3A2A1F]"
                  >
                    <Check className="size-3 text-[#689F38]" strokeWidth={2.5} />
                    {optionLabel(id)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#9E8B7E]">No preferences set yet.</p>
            )}

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              type="button"
              onClick={startEditing}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#D9CCBB] bg-white px-4 py-2 text-xs font-semibold text-[#3A2A1F] transition-colors hover:bg-[#F5EDE0]"
            >
              <Pencil className="size-3.5" />
              {saved.length > 0 ? "Change preferences" : "Set preferences"}
            </button>
          </div>
        )}

        <h2 className="mt-8 text-base font-semibold text-[#3A2A1F]">Communications</h2>
        <p className="mt-1 text-sm leading-5 text-[#6F5B4B]">
          Choose how you&apos;d like to hear from us.
        </p>

        <div className="mt-4 divide-y divide-[#E8DCCB] rounded-[24px] border border-[#E8DCCB] bg-white px-4">
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#3A2A1F]">Push notifications</p>
              <p className="mt-0.5 text-xs leading-4 text-[#6F5B4B]">
                Get notified on this device when a friend accepts your invite or someone joins your family.
              </p>
            </div>
            <Switch
              checked={notificationPreferences?.pushEnabled ?? false}
              onCheckedChange={(checked) => void handleTogglePush(checked)}
              disabled={!notificationPreferences || updatingChannel !== null}
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#3A2A1F]">Email updates</p>
              <p className="mt-0.5 text-xs leading-4 text-[#6F5B4B]">
                Occasional emails about your account, your plans, and what&apos;s new.
              </p>
            </div>
            <Switch
              checked={notificationPreferences?.emailEnabled ?? false}
              onCheckedChange={(checked) => void handleToggleEmail(checked)}
              disabled={!notificationPreferences || updatingChannel !== null}
            />
          </div>
        </div>

        {notificationError && <p className="mt-3 text-sm text-red-600">{notificationError}</p>}
      </div>
    </main>
  );
}
