import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon, PrismaNeonHttp } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Node.js has no built-in WebSocket support before v22 - supplying `ws` explicitly (rather
// than relying on a maybe-present global) works on every Node version this project targets.
// Harmless when DATABASE_DRIVER isn't "neon": this only configures the neondatabase package,
// which then does nothing unless that adapter is actually instantiated below. Confirmed by
// reading @prisma/adapter-neon's own dist/index.js (ADR 19): PrismaNeonHttpAdapterFactory.connect()
// calls only neon.neon(connectionString, options) (plain HTTP) - it never touches Pool, Client,
// or this webSocketConstructor setting. Only PrismaNeonAdapterFactory.connect() (the "neon"
// driver, not "neon-http") calls `new neon.Pool(...)`, which is what actually opens a wss://
// connection - so a live wss://.../v2 attempt while DATABASE_DRIVER=neon-http is set can only mean
// either this branch was never reached with that value (see the logging below) or the running
// process predates the deploy that set it.
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Which driver PrismaClient talks to Postgres through - see docs/decisions.md (ADR 16, 18).
 * "pg" (default): raw wire protocol over TCP, port 5432 - local dev, or any host that can
 *   reach the database directly.
 * "neon": Neon's serverless driver, tunnelled over WebSocket, port 443 - for a host that blocks
 *   5432 but allows a WebSocket Upgrade.
 * "neon-http": Neon's serverless driver over plain HTTPS POST requests, no WebSocket Upgrade at
 *   all - for a host that blocks 5432 *and* WebSocket, such as the current deploy host. Prisma
 *   transactions are NOT supported in this mode (Neon's HTTP endpoint has no session/interactive
 *   transaction support) - any nested write or explicit $transaction() call throws "Transactions
 *   are not supported in HTTP mode". /api/checkout's nested Order+OrderItem create hits exactly
 *   this; see ADR 18 for the current status of that.
 * Set via DATABASE_DRIVER in the environment actually running the app, independent of how the
 * app was built - see docs/README.md §5.
 */
function createAdapter() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Check .env / .env.example.");
  }

  // Trimmed defensively: a trailing "\r" (CRLF pasted into a panel that only strips "\n") or
  // stray whitespace would otherwise fail every branch below silently-ish (it still throws, but
  // as a confusing "Unknown DATABASE_DRIVER" with invisible characters in the message) instead of
  // being tolerated the way a human typing the value would expect.
  const rawDriver = process.env.DATABASE_DRIVER;
  const driver = (rawDriver ?? "pg").trim();

  // Unconditional (not gated behind NODE_ENV) and printed before the branch runs, specifically so
  // this is visible in the host's own process log - see docs/decisions.md ADR 19. Print the raw
  // env value too (JSON.stringify to make stray whitespace visible) since "the value looked right
  // when I typed it" and "the value the process actually received" are different claims.
  console.log(
    `[lib/prisma] DATABASE_DRIVER raw=${JSON.stringify(rawDriver)} resolved=${JSON.stringify(driver)}`,
  );

  if (driver === "neon") {
    console.log("[lib/prisma] using PrismaNeon (WebSocket, wss://.../v2)");
    return new PrismaNeon({ connectionString });
  }
  if (driver === "neon-http") {
    console.log("[lib/prisma] using PrismaNeonHttp (plain HTTPS, no WebSocket)");
    return new PrismaNeonHttp(connectionString, {});
  }
  if (driver === "pg") {
    console.log("[lib/prisma] using PrismaPg (direct TCP, port 5432)");
    return new PrismaPg({ connectionString });
  }
  throw new Error(`Unknown DATABASE_DRIVER ${JSON.stringify(driver)}. Expected "pg", "neon", or "neon-http".`);
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter: createAdapter() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
