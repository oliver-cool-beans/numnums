import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const LOOPS_API_KEY = Deno.env.get("LOOPS_API_KEY")!;

const TRANSACTIONAL_IDS = {
  familyInvite: "cmq80rwkc39z60jxqy8qvqo04",
  friendInvite: "cmq66n8pz059d0jwcud69szb3",
} as const;;

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
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) {
    console.error(`[loops] getUserEmail failed for userId=${userId}`, error);
    return null;
  }
  const email = data.user?.email ?? null;
  if (!email) console.warn(`[loops] no email found for userId=${userId}`);
  return email;
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
    const body = await response.text();
    throw new Error(`[loops] event "${eventName}" to ${email} failed (${response.status}): ${body}`);
  }
  console.log(`[loops] sent event "${eventName}" to ${email}`);
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
  const rawId = typeof record.id === "string" || typeof record.id === "number" ? String(record.id) : "(no id)";
  if (!userId) {
    console.warn(`[loops] skipping "${eventName}" — no userId on record id=${rawId}`);
    return;
  }
  const email = await getUserEmail(userId);
  if (!email) {
    console.warn(`[loops] skipping "${eventName}" — no email for userId=${userId}`);
    return;
  }
  const idempotencyKey = typeof record.id === "string" ? `${eventName}:${record.id}` : undefined;
  const keyLabel = idempotencyKey ? ` key=${idempotencyKey}` : "";
  console.log(`[loops] dispatching "${eventName}" for userId=${userId}${keyLabel}`);
  await send(email, eventName, eventProperties, idempotencyKey);
}

async function sendTransactional(
  email: string,
  transactionalId: string,
  dataVariables: Record<string, string>,
  idempotencyKey?: string,
): Promise<void> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${LOOPS_API_KEY}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  console.log(`[loops] sending transactional id=${transactionalId} to ${email}`);
  const response = await fetch("https://app.loops.so/api/v1/transactional", {
    method: "POST",
    headers,
    body: JSON.stringify({ transactionalId, email, dataVariables }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`[loops] transactional id=${transactionalId} to ${email} failed (${response.status}): ${body}`);
  }
  console.log(`[loops] transactional id=${transactionalId} delivered to ${email}`);
}

async function sendInviteEmail(record: Row): Promise<void> {
  const inviteeEmail = record.invitee_email as string | undefined;
  const inviteUrl = record.invite_url as string | undefined;
  const kind = record.kind as string | undefined;
  const inviterId = record.inviter_id as string | undefined;

  if (!inviteeEmail || !inviteUrl) {
    console.log("[loops] sendInviteEmail skipping — no invitee_email/invite_url (link-only invite)");
    return;
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("name")
    .eq("id", inviterId)
    .maybeSingle();

  if (error) console.warn(`[loops] sendInviteEmail could not fetch inviter name for inviterId=${inviterId}`, error);
  const inviterName = (profile?.name as string | null)?.split(" ")[0] || "Someone";

  const transactionalId = kind === "family" ? TRANSACTIONAL_IDS.familyInvite : TRANSACTIONAL_IDS.friendInvite;
  const dataVariables: Record<string, string> =
    kind === "family"
      ? { inviterName, inviteLink: inviteUrl }
      : { friendName: inviterName, inviteLink: inviteUrl };

  const idempotencyKey = typeof record.id === "string" ? `invite-email:${record.id}` : undefined;
  await sendTransactional(inviteeEmail, transactionalId, dataVariables, idempotencyKey);
}

function statusChangedTo(record: Row, oldRecord: Row | null, status: string): boolean {
  return record.status === status && oldRecord?.status !== status;
}

async function trackRecipeProgress(record: Row, oldRecord: Row | null): Promise<void> {
  const status = record.status as string | undefined;
  const previousStatus = (oldRecord?.status as string | undefined) ?? "not_started";
  console.log(`[loops] trackRecipeProgress status=${status} previousStatus=${previousStatus}`);
  if (status === previousStatus) {
    console.log("[loops] trackRecipeProgress status unchanged, skipping");
    return;
  }
  const userId = record.user_id as string | undefined;
  if (status === "in_progress") await trackForUser(record, userId, "Recipe Started");
  else if (status === "completed") await trackForUser(record, userId, "Recipe Completed");
  else console.log(`[loops] trackRecipeProgress untracked status="${status}", skipping`);
}

async function trackFamilyInviteAccepted(record: Row): Promise<void> {
  const familyId = record.family_id as string | undefined;
  const role = record.role as string | undefined;
  console.log(`[loops] trackFamilyInviteAccepted familyId=${familyId} role=${role}`);
  if (!familyId) {
    console.warn("[loops] trackFamilyInviteAccepted skipping — no familyId");
    return;
  }
  if (role === "owner") {
    console.log("[loops] trackFamilyInviteAccepted skipping — inserting owner, not an accept");
    return;
  }

  const { data: owner, error } = await supabase
    .from("family_members")
    .select("user_id")
    .eq("family_id", familyId)
    .eq("role", "owner")
    .maybeSingle();

  if (error) {
    console.error(`[loops] trackFamilyInviteAccepted failed to fetch owner for familyId=${familyId}`, error);
    return;
  }
  if (!owner) {
    console.warn(`[loops] trackFamilyInviteAccepted no owner found for familyId=${familyId}`);
    return;
  }

  await trackForUser(record, owner.user_id as string | undefined, "Invite Accepted", { type: "family" });
}

/**
 * Each entry decides whether a given row change is worth forwarding to Loops —
 * the dispatcher routes by `table:TYPE` and stays a dumb generic router.
 */
const RESOLVERS: Record<string, Resolver> = {
  "invites:INSERT": (record) => sendInviteEmail(record),
  "users:INSERT": (record) => trackForUser(record, record.id as string | undefined, "Signed Up"),
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
  const key = `${event.table}:${event.type}`;
  const resolver = RESOLVERS[key];
  if (!resolver) {
    console.log(`[loops] no resolver for ${key}, skipping`);
    return;
  }
  console.log(`[loops] running resolver for ${key}`);
  await resolver(event.record, event.old_record);
}
