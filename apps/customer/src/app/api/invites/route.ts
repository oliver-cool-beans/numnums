import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { signInviteToken } from "@/lib/inviteToken";

// The sole exception to "no API routes for customer data" (see apps/customer/agents.md):
// minting an invite link requires signing a JWT with INVITE_TOKEN_SECRET, a
// secret that must never reach the browser. Everything else about invites
// (preview, acceptance) is verified/handled without a server route.
// The invite email itself is sent by the event-dispatcher edge function
// reacting to the invites:INSERT webhook — no Loops call needed here.

const INVITE_TTL_DAYS = 7;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CreateInviteBody = {
  kind?: unknown;
  familyId?: unknown;
  email?: unknown;
};

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!accessToken) {
    return NextResponse.json({ error: "Missing access token" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CreateInviteBody | null;
  const kind = body?.kind;
  const familyId = typeof body?.familyId === "string" ? body.familyId : null;
  const rawEmail = typeof body?.email === "string" ? body.email.trim() : null;

  if (kind !== "family" && kind !== "friend") {
    return NextResponse.json({ error: "kind must be 'family' or 'friend'" }, { status: 400 });
  }

  if (kind === "family" && !familyId) {
    return NextResponse.json({ error: "familyId is required for family invites" }, { status: 400 });
  }

  if (rawEmail && !EMAIL_PATTERN.test(rawEmail)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  // Generated up front (rather than relying on the column default) so the
  // signed URL can be stored on the row for the event-dispatcher to pick up.
  const id = globalThis.crypto.randomUUID();
  const token = await signInviteToken(id, expiresAt);
  const url = new URL(`/invite/${token}`, request.url);

  const { error: insertError } = await supabase.from("invites").insert({
    id,
    kind,
    inviter_id: user.id,
    family_id: kind === "family" ? familyId : null,
    expires_at: expiresAt.toISOString(),
    invitee_email: rawEmail,
    invite_url: rawEmail ? url.toString() : null,
  });

  if (insertError) {
    return NextResponse.json({ error: "Could not create invite" }, { status: 400 });
  }

  return NextResponse.json({ url: url.toString(), expiresAt: expiresAt.toISOString() });
}
