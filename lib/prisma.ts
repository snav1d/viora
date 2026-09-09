import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Node.js has no built-in WebSocket support before v22 - supplying `ws` explicitly (rather
// than relying on a maybe-present global) works on every Node version this project targets.
// Harmless when DATABASE_DRIVER is "pg": this only configures the neondatabase package, which
// then does nothing unless a Neon adapter is actually instantiated below.
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Which driver PrismaClient talks to Postgres through - see docs/decisions.md.
 * "pg" (default): raw wire protocol over TCP, port 5432 - local dev, or any host that can
 *   reach the database directly.
 * "neon": Neon's serverless driver, tunnelled over WebSocket/HTTPS, port 443 - required on the
 *   deploy host, whose firewall blocks outbound 5432 entirely.
 * Set via DATABASE_DRIVER in the environment actually running the app, independent of how the
 * app was built - see docs/README.md §5.
 */
function createAdapter() {
  const connectionString = process.env.DATABASE_URL;
  const driver = process.env.DATABASE_DRIVER ?? "pg";

  if (driver === "neon") {
    return new PrismaNeon({ connectionString });
  }
  if (driver === "pg") {
    return new PrismaPg({ connectionString });
  }
  throw new Error(`Unknown DATABASE_DRIVER "${driver}". Expected "pg" or "neon".`);
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter: createAdapter() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
