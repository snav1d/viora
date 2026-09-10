import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { createHash } from "node:crypto";

const COOKIE_NAME = "viora_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// A short, non-reversible fingerprint (never the secret itself) so two requests signing and
// verifying with genuinely different AUTH_SESSION_SECRET values - e.g. a Passenger worker
// process still running with a value from before the host's env var was last changed, not
// restarted since - become visible in the logs instead of silently producing "user is always
// logged out" with no trace of why. See docs/decisions.md ADR 21.
function secretFingerprint(secret: string): string {
  return createHash("sha256").update(secret).digest("hex").slice(0, 8);
}

function getSecretKey() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) {
    throw new Error("AUTH_SESSION_SECRET is not set. Check .env / .env.example.");
  }
  console.log(`[lib/auth/session] AUTH_SESSION_SECRET fingerprint=${secretFingerprint(secret)}`);
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  phone: string;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    // Next's own generated standalone server.js hardcodes `process.env.NODE_ENV = "production"`
    // unconditionally before any app code runs (see .next/standalone/server.js), independent of
    // anything set on the host - so this is always true in the deployed artifact, never a source
    // of a cookie silently not being marked Secure there. `secure: true` itself is not a problem
    // over HTTPS either way: it restricts the cookie to HTTPS requests, which is 100% of traffic
    // to this deployment - it does not require the *backend* Node process to see the request as
    // HTTPS (a reverse proxy terminating TLS in front of it is the normal case and is fine).
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    console.log("[lib/auth/session] getSession: request carried no session cookie");
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.userId !== "string" || typeof payload.phone !== "string") {
      console.warn("[lib/auth/session] getSession: token verified but payload shape is wrong");
      return null;
    }
    return { userId: payload.userId, phone: payload.phone };
  } catch (error) {
    // Logged (not swallowed) specifically because "signature verification failed" and "cookie
    // just wasn't sent" look identical to the end user (both mean getSession() returns null and
    // every authenticated feature acts logged-out) but have very different causes - a signature
    // mismatch means whatever signed this token used a different AUTH_SESSION_SECRET than this
    // process is verifying with right now, which is exactly the failure mode this log is for.
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.warn(`[lib/auth/session] getSession: token present but verification failed - ${reason}`);
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
