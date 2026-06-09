import { sendPushToUser } from "./push.ts";
import { dispatchToLoops, firstName, type WebhookEvent } from "./loops.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Provided by the Supabase Edge Functions runtime, not the Deno standard lib.
declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function notifyFriendInviteAccepted(record: Record<string, unknown>): Promise<void> {
  const requesterId = record.requester_id as string | undefined;
  const addresseeId = record.addressee_id as string | undefined;
  if (!requesterId || !addresseeId) return;

  const { data: addressee } = await supabase.from("users").select("name").eq("id", addresseeId).maybeSingle();

  await sendPushToUser(requesterId, {
    title: "Invite accepted",
    body: `${firstName(addressee?.name, "Someone")} accepted your friend invite`,
    url: "/dashboard/friends",
  });
}

async function notifyFamilyMemberJoined(record: Record<string, unknown>): Promise<void> {
  const familyId = record.family_id as string | undefined;
  const memberId = record.user_id as string | undefined;
  const role = record.role as string | undefined;
  if (!familyId || !memberId || role === "owner") return;

  const [{ data: owner }, { data: member }, { data: family }] = await Promise.all([
    supabase.from("family_members").select("user_id").eq("family_id", familyId).eq("role", "owner").maybeSingle(),
    supabase.from("users").select("name").eq("id", memberId).maybeSingle(),
    supabase.from("families").select("name").eq("id", familyId).maybeSingle(),
  ]);

  if (!owner?.user_id) return;

  await sendPushToUser(owner.user_id, {
    title: "New family member",
    body: `${firstName(member?.name, "Someone")} joined ${family?.name || "your family"}`,
    url: "/dashboard/groups",
  });
}

/**
 * Push is the only destination that needs row-specific copy, so it keeps its
 * own small handler map here. Loops gets the raw row and decides for itself
 * (in loops.ts) whether — and as what — to forward it; that keeps this file
 * a generic router rather than a growing pile of per-destination logic.
 */
const PUSH_HANDLERS: Record<string, (record: Record<string, unknown>) => Promise<void>> = {
  "friendships:INSERT": notifyFriendInviteAccepted,
  "family_members:INSERT": notifyFamilyMemberJoined,
};

Deno.serve(async (req) => {
  let payload: WebhookEvent;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  if (payload.record) {
    const key = `${payload.table}:${payload.type}`;
    const tasks = [dispatchToLoops(payload)];

    const pushHandler = PUSH_HANDLERS[key];
    if (pushHandler) tasks.push(pushHandler(payload.record));

    // Ack the webhook immediately — Postgres holds the trigger open until we
    // respond, and nothing in `tasks` (Loops/push HTTP calls) needs to
    // finish before that. `waitUntil` keeps the isolate alive to finish them.
    EdgeRuntime.waitUntil(
      Promise.allSettled(tasks).then((results) => {
        for (const result of results) {
          if (result.status === "rejected") {
            console.error(`[event-dispatcher] handler failed for ${key}`, result.reason);
          }
        }
      }),
    );
  }

  return new Response("ok", { status: 200 });
});
