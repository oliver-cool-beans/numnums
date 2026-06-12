import { dispatchToLoops, type WebhookEvent } from "./loops.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Provided by the Supabase Edge Functions runtime, not the Deno standard lib.
declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  let payload: WebhookEvent;
  try {
    payload = await req.json();
  } catch (err) {
    console.error("[event-dispatcher] failed to parse request body", err);
    return new Response("Invalid payload", { status: 400 });
  }

  const key = `${payload.table}:${payload.type}`;
  const rawId = payload.record?.id;
  const recordId = typeof rawId === "string" || typeof rawId === "number" ? String(rawId) : "(no id)";
  console.log(`[event-dispatcher] received ${key} id=${recordId}`);

  if (!payload.record) {
    console.warn(`[event-dispatcher] event ${key} has no record, skipping`);
    return new Response("ok", { status: 200 });
  }

  const tasks = [dispatchToLoops(payload)];

  // Ack the webhook immediately — Postgres holds the trigger open until we
  // respond, and nothing in `tasks` (Loops/push HTTP calls) needs to
  // finish before that. `waitUntil` keeps the isolate alive to finish them.
  EdgeRuntime.waitUntil(
    Promise.allSettled(tasks).then((results) => {
      for (const result of results) {
        if (result.status === "rejected") {
          console.error(`[event-dispatcher] handler failed for ${key} id=${recordId}`, result.reason);
        } else {
          console.log(`[event-dispatcher] handler completed for ${key} id=${recordId}`);
        }
      }
    }),
  );

  return new Response("ok", { status: 200 });
});
