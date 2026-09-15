import "server-only";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

/** The logged-in user's own ServiceProviderProfile, or null if they don't have one (haven't
 * applied) or aren't logged in at all. Mirrors lib/auth/seller.ts's getSellerProfile exactly -
 * see app/provider/(panel)/layout.tsx for the actual gate. */
export async function getServiceProviderProfile() {
  const session = await getSession();
  if (!session) return null;
  return prisma.serviceProviderProfile.findUnique({ where: { userId: session.userId } });
}

/** Every provider API route needs this exact check (logged in + APPROVED ServiceProviderProfile)
 * - the page-level gate in app/provider/(panel)/layout.tsx only stops navigation, it doesn't run
 * for fetch() calls hitting these routes directly. Returns null when the check fails. */
export async function requireApprovedProvider() {
  const profile = await getServiceProviderProfile();
  if (!profile || profile.status !== "APPROVED") return null;
  return profile;
}
