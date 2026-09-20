import "server-only";

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";

const SESSION_COOKIE = "session";
const SESSION_DURATION = "7d";

// Fail loudly at startup if the secret is missing, rather than letting
// TextEncoder().encode(undefined) throw a confusing error later.
const secret = process.env.SESSION_SECRET;
if (!secret) {
  throw new Error(
    "SESSION_SECRET is not set. Generate one with `openssl rand -base64 32` and add it to .env.",
  );
}
const encodedKey = new TextEncoder().encode(secret);

// The payload holds only an identifier, never a role or other permission data.
// Anything besides an id can go stale before the token expires; the id is
// always used to look up fresh data from the database.
type SessionPayload = { userId: number };

async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(encodedKey);
}

// Returns the payload for a valid, unexpired, correctly signed token, or
// undefined for anything else: missing, tampered, expired or malformed. A
// caller only has to check "did I get a payload back?".
export async function decrypt(token: string | undefined): Promise<SessionPayload | undefined> {
  if (!token) return undefined;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return undefined;
  }
}

// Reads the cookie and verifies it. Returns undefined if there is no cookie,
// or if it's invalid, tampered or expired: all of those just mean "nobody's
// logged in", not an error. cache() means that if several components in the
// same request all ask "who is this", the cookie is only decrypted once.
export const getSession = cache(async (): Promise<SessionPayload | undefined> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return decrypt(token);
});

export async function createSession(userId: number): Promise<void> {
  const token = await encrypt({ userId });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Plain HTTP in local development has no TLS to protect the cookie in
    // transit, so the Secure flag only turns on for a real deployment.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days, matching SESSION_DURATION above.
  });
}

// Tells the browser to drop the cookie (a Set-Cookie header for the same name
// and path, already expired). It does not invalidate the token itself: a copy
// of it would stay valid until it expires, because the server keeps no list of
// issued sessions.
export async function deleteSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
