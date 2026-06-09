import { supabase } from "./supabase-client";
import { getPushPermissionState } from "./pushNotifications";

const STORAGE_KEY = "numnums:notifications-prompt";

export type NotificationPromptCopy = { title: string; message: string };

function queue(copy: NotificationPromptCopy) {
  if (!globalThis.window) return;
  globalThis.window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
}

// Split into a pure peek (safe to use as a useState initializer, which React
// may invoke more than once) and an explicit clear (call once, from an effect
// or event handler) — combining read-and-clear into one impure function would
// risk losing the prompt to a double-invocation.
export function peekQueuedNotificationPrompt(): NotificationPromptCopy | null {
  if (!globalThis.window) return null;
  const raw = globalThis.window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NotificationPromptCopy;
  } catch {
    return null;
  }
}

export function clearQueuedNotificationPrompt(): void {
  globalThis.window?.sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * Each "maybe" helper checks whether the action that just succeeded was the
 * user's first of its kind, and if so queues a soft-ask prompt to be shown on
 * the dashboard (the page these flows redirect/return to). Declining the
 * native permission prompt is one-shot and irreversible, so we only ever show
 * our own dismissible prompt here — see EnableNotificationsPrompt.
 */

export async function maybeQueueFriendInviteAcceptedPrompt(userId: string): Promise<void> {
  if (getPushPermissionState() !== "default") return;
  try {
    const { count, error } = await supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    if (error) throw error;
    if (count === 1) {
      queue({
        title: "Know when friends connect",
        message: "Turn on notifications and we'll let you know when a friend accepts your invite.",
      });
    }
  } catch (err) {
    console.error("[notificationPrompts] friend invite accepted check failed", err);
  }
}

export async function maybeQueueFriendInviteSentPrompt(userId: string): Promise<void> {
  if (getPushPermissionState() !== "default") return;
  try {
    const { count, error } = await supabase
      .from("invites")
      .select("*", { count: "exact", head: true })
      .eq("inviter_id", userId)
      .eq("kind", "friend");
    if (error) throw error;
    if (count === 1) {
      queue({
        title: "We'll let you know",
        message: "Turn on notifications so you find out the moment your friend accepts your invite.",
      });
    }
  } catch (err) {
    console.error("[notificationPrompts] friend invite sent check failed", err);
  }
}

export async function maybeQueueFamilyInviteSentPrompt(userId: string): Promise<void> {
  if (getPushPermissionState() !== "default") return;
  try {
    const { count, error } = await supabase
      .from("invites")
      .select("*", { count: "exact", head: true })
      .eq("inviter_id", userId)
      .eq("kind", "family");
    if (error) throw error;
    if (count === 1) {
      queue({
        title: "We'll let you know",
        message: "Turn on notifications so you find out the moment they join your family.",
      });
    }
  } catch (err) {
    console.error("[notificationPrompts] family invite sent check failed", err);
  }
}

export async function maybeQueueFamilyCreatedPrompt(userId: string): Promise<void> {
  if (getPushPermissionState() !== "default") return;
  try {
    const { count, error } = await supabase
      .from("family_members")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("role", "owner");
    if (error) throw error;
    if (count === 1) {
      queue({
        title: "Stay in the loop",
        message: "Turn on notifications and we'll let you know when someone joins your family.",
      });
    }
  } catch (err) {
    console.error("[notificationPrompts] family created check failed", err);
  }
}
