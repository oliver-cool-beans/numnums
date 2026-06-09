import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

export type PushMessage = { title: string; body: string; url?: string };

/**
 * Sends a push to every device registered for `userId`, but only if they have
 * push notifications turned on. Dead subscriptions (404/410 from the push
 * service) are deleted reactively rather than pruned on a schedule — this
 * table is bounded by device count, not activity.
 */
export async function sendPushToUser(userId: string, message: PushMessage): Promise<void> {
  const { data: preferences } = await supabase
    .from("user_notification_preferences")
    .select("push_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (!preferences?.push_enabled) return;

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subscriptions?.length) return;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          JSON.stringify(message),
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
        } else {
          console.error(`[event-dispatcher] push send failed for subscription ${subscription.id}`, err);
        }
      }
    }),
  );
}
