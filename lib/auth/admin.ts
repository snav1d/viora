import "server-only";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { parseRoles } from "@/lib/auth/roles";

/**
 * Unlike SellerProfile, there's no separate "AdminProfile" table - ADMIN is just one more value
 * in the same User.roles array every other role lives in (ADR 7/20's multi-role design). The
 * very first ADMIN is granted by editing the database directly (the same bootstrap approach
 * already used for seller approval - see docs/decisions.md ADR 30); nothing in this codebase
 * signs up a user as an admin through the app itself.
 *
 * SessionPayload carries no role info (ADR 21), so - same as requireApprovedSeller - this always
 * needs a fresh DB lookup per request; the page-level gate in app/admin/layout.tsx only stops
 * navigation, not a direct fetch() to an admin API route, so every admin route needs its own
 * check regardless of what the layout already enforced.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !parseRoles(user.roles).includes("ADMIN")) return null;

  return user;
}
