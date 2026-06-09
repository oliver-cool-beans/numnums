import { SignJWT, jwtVerify, errors as joseErrors } from "jose";

const ISSUER = "numnums-invites";
const ALGORITHM = "HS256";

function getSecretKey(): Uint8Array {
  const secret = process.env.INVITE_TOKEN_SECRET;

  if (!secret) {
    throw new Error("INVITE_TOKEN_SECRET is not configured");
  }

  return new TextEncoder().encode(secret);
}

export async function signInviteToken(inviteId: string, expiresAt: Date): Promise<string> {
  return new SignJWT({ inviteId })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSecretKey());
}

export type VerifiedInviteToken = { inviteId: string };

export async function verifyInviteToken(token: string): Promise<VerifiedInviteToken | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: ISSUER,
      algorithms: [ALGORITHM],
    });

    if (typeof payload.inviteId !== "string") {
      return null;
    }

    return { inviteId: payload.inviteId };
  } catch (error) {
    if (
      error instanceof joseErrors.JWTExpired ||
      error instanceof joseErrors.JWTInvalid ||
      error instanceof joseErrors.JWSSignatureVerificationFailed
    ) {
      return null;
    }

    throw error;
  }
}
