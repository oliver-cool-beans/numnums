import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const LOOPS_API_KEY = Deno.env.get("LOOPS_API_KEY")!;

export function firstName(name: string | null | undefined, fallback: string): string {
  return name?.split(" ")[0] || fallback;
}

export type WebhookEvent = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
};

type Row = Record<string, unknown>;
type Resolver = (record: Row, oldRecord: Row | null) => Promise<void>;

/**
 * `public.users` has no email column — the auth record is the only source of
 * truth, and the service-role client can read it directly.
 */
async function getUserEmail(userId: string): Promise<string | null> {
  const { data } = await supabase.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

async function send(
  email: string,
  eventName: string,
  eventProperties?: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<void> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${LOOPS_API_KEY}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const response = await fetch("https://app.loops.so/api/v1/events/send", {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      eventName,
      ...(eventProperties ? { eventProperties } : {}),
    }),
  });

  if (!response.ok) {
    console.error(`[event-dispatcher] loops event "${eventName}" failed`, response.status, await response.text());
  }
}

/**
 * `record.id` is the row's stable primary key — pairing it with the event
 * name gives Loops an idempotency key so a Postgres webhook retry can't
 * double-fire the same lifecycle event.
 */
async function trackForUser(
  record: Row,
  userId: string | undefined,
  eventName: string,
  eventProperties?: Record<string, unknown>,
): Promise<void> {
  if (!userId) return;
  const email = await getUserEmail(userId);
  if (!email) return;
  const idempotencyKey = typeof record.id === "string" ? `${eventName}:${record.id}` : undefined;
  await send(email, eventName, eventProperties, idempotencyKey);
}

function statusChangedTo(record: Row, oldRecord: Row | null, status: string): boolean {
  return record.status === status && oldRecord?.status !== status;
}

async function trackRecipeProgress(record: Row, oldRecord: Row | null): Promise<void> {
  const status = record.status as string | undefined;
  const previousStatus = (oldRecord?.status as string | undefined) ?? "not_started";
  if (status === previousStatus) return;
  const userId = record.user_id as string | undefined;
  if (status === "in_progress") await trackForUser(record, userId, "Recipe Started");
  else if (status === "completed") await trackForUser(record, userId, "Recipe Completed");
}

/**
 * Sends the "you've been invited" email — Loops owns delivery via an automated
 * loop triggered by this event, so eventProperties carry everything needed to
 * render it (the signed URL is built by the API route, where the secret lives).
 */
async function trackInviteSent(record: Row): Promise<void> {
  const email = record.invitee_email as string | null | undefined;
  const url = record.invite_url as string | null | undefined;
  const inviterId = record.inviter_id as string | undefined;
  const kind = record.kind as string | undefined;
  if (!email || !url || !inviterId || (kind !== "friend" && kind !== "family")) return;

  const { data: inviter } = await supabase.from("users").select("name").eq("id", inviterId).maybeSingle();
  const eventName = kind === "family" ? "Family Invite Sent" : "Friend Invite Sent";
  const idempotencyKey = typeof record.id === "string" ? `${eventName}:${record.id}` : undefined;
  await send(
    email,
    eventName,
    { url, inviterName: firstName(inviter?.name, "Someone") },
    idempotencyKey,
  );
}

async function trackFamilyInviteAccepted(record: Row): Promise<void> {
  const familyId = record.family_id as string | undefined;
  const role = record.role as string | undefined;
  if (!familyId || role === "owner") return;

  const { data: owner } = await supabase
    .from("family_members")
    .select("user_id")
    .eq("family_id", familyId)
    .eq("role", "owner")
    .maybeSingle();

  await trackForUser(record, owner?.user_id as string | undefined, "Invite Accepted", { type: "family" });
}

/**
 * Each entry decides whether a given row change is worth forwarding to Loops —
 * the dispatcher routes by `table:TYPE` and stays a dumb generic router.
 */
const RESOLVERS: Record<string, Resolver> = {
  "users:INSERT": (record) => trackForUser(record, record.id as string | undefined, "Signed Up"),
  "invites:INSERT": (record) => trackInviteSent(record),
  "friendships:INSERT": (record) =>
    trackForUser(record, record.requester_id as string | undefined, "Invite Accepted", { type: "friend" }),
  "family_members:INSERT": (record) => trackFamilyInviteAccepted(record),
  "user_meal_plans:INSERT": (record) => trackForUser(record, record.user_id as string | undefined, "Meal Plan Created"),
  "user_recipe_progress:INSERT": (record) => trackRecipeProgress(record, null),
  "user_recipe_progress:UPDATE": trackRecipeProgress,
  "recipe_swap_suggestions:INSERT": (record) =>
    trackForUser(record, record.suggested_by_user_id as string | undefined, "Recipe Swap Suggested"),

  "shopping_lists:UPDATE": async (record, oldRecord) => {
    const userId = record.user_id as string | undefined;
    if (statusChangedTo(record, oldRecord, "confirmed")) {
      await trackForUser(record, userId, "Shopping List Confirmed");
    } else if (statusChangedTo(record, oldRecord, "completed")) {
      await trackForUser(record, userId, "Shopping List Completed");
    }
  },

  "recipe_swap_suggestions:UPDATE": async (record, oldRecord) => {
    if (statusChangedTo(record, oldRecord, "approved")) {
      await trackForUser(record, record.suggested_by_user_id as string | undefined, "Recipe Swap Approved");
    }
  },

  "user_notification_preferences:UPDATE": async (record, oldRecord) => {
    if (record.email_enabled !== oldRecord?.email_enabled) {
      await trackForUser(record, record.user_id as string | undefined, "Email Notifications Updated", {
        enabled: record.email_enabled,
      });
    }
  },
};

export async function dispatchToLoops(event: WebhookEvent): Promise<void> {
  if (!event.record) return;
  const resolver = RESOLVERS[`${event.table}:${event.type}`];
  if (resolver) await resolver(event.record, event.old_record);
}
