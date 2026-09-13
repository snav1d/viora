import "server-only";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

/** The logged-in user's own SellerProfile, or null if they don't have one (haven't applied) or
 * aren't logged in at all. Callers decide what "no profile" / a given `status` means for routing
 * - see app/seller/(panel)/layout.tsx for the actual gate. */
export async function getSellerProfile() {
  const session = await getSession();
  if (!session) return null;
  return prisma.sellerProfile.findUnique({ where: { userId: session.userId } });
}

/** Every seller API route needs this exact check (logged in + APPROVED SellerProfile) - the
 * page-level gate in app/seller/(panel)/layout.tsx only stops navigation, it doesn't run for
 * fetch() calls hitting these routes directly. Returns null when the check fails. */
export async function requireApprovedSeller() {
  const profile = await getSellerProfile();
  if (!profile || profile.status !== "APPROVED") return null;
  return profile;
}
