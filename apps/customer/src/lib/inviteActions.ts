import { supabase } from "./supabase-client";

export type CreatedInvite = { url: string; expiresAt: string };

async function createInvite(
  body: { kind: "friend"; email?: string } | { kind: "family"; familyId: string; email?: string },
): Promise<CreatedInvite> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be signed in to create an invite");
  }

  const response = await fetch("/api/invites", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error || "Could not create the invite link");
  }

  return { url: payload.url as string, expiresAt: payload.expiresAt as string };
}

export function createFriendInvite(email?: string): Promise<CreatedInvite> {
  return createInvite({ kind: "friend", email });
}

export function createFamilyInvite(familyId: string, email?: string): Promise<CreatedInvite> {
  return createInvite({ kind: "family", familyId, email });
}
