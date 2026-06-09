import { supabase } from "./supabase-client";

export type NotificationPreferences = {
  pushEnabled: boolean;
  emailEnabled: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  pushEnabled: false,
  emailEnabled: true,
};

export async function fetchNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("user_notification_preferences")
    .select("push_enabled, email_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return DEFAULT_PREFERENCES;

  return { pushEnabled: data.push_enabled, emailEnabled: data.email_enabled };
}

export async function saveNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>,
): Promise<void> {
  const { error } = await supabase.from("user_notification_preferences").upsert(
    {
      user_id: userId,
      ...(preferences.pushEnabled !== undefined ? { push_enabled: preferences.pushEnabled } : {}),
      ...(preferences.emailEnabled !== undefined ? { email_enabled: preferences.emailEnabled } : {}),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
}
