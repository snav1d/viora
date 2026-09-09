import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon, PrismaNeonHttp } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Node.js has no built-in WebSocket support before v22 - supplying `ws` explicitly (rather
// than relying on a maybe-present global) works on every Node version this project targets.
// Harmless when DATABASE_DRIVER isn't "neon": this only configures the neondatabase package,
// which then does nothing unless that adapter is actually instantiated below.
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
  const driver = process.env.DATABASE_DRIVER ?? "pg";

  if (driver === "neon") {
    return new PrismaNeon({ connectionString });
  }
  if (driver === "neon-http") {
    return new PrismaNeonHttp(connectionString, {});
  }
  if (driver === "pg") {
    return new PrismaPg({ connectionString });
  }
  throw new Error(`Unknown DATABASE_DRIVER "${driver}". Expected "pg", "neon", or "neon-http".`);
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter: createAdapter() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
