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

/** Every seller API route that creates something new (a product) needs this exact check (logged
 * in + APPROVED SellerProfile) - the page-level gate in app/seller/(panel)/layout.tsx only stops
 * navigation, it doesn't run for fetch() calls hitting these routes directly. Returns null when
 * the check fails. */
export async function requireApprovedSeller() {
  const profile = await getSellerProfile();
  if (!profile || profile.status !== "APPROVED") return null;
  return profile;
}

/** A SUSPENDED seller keeps managing their existing catalog and fulfilling existing orders -
 * only creating brand-new products is blocked (docs/decisions.md ADR 38, "سفارش‌های قبلیش
 * دست‌نخورده می‌مونه"). Every seller route except product creation should gate on this, not
 * requireApprovedSeller(). */
export async function requireOperatingSeller() {
  const profile = await getSellerProfile();
  if (!profile || (profile.status !== "APPROVED" && profile.status !== "SUSPENDED")) return null;
  return profile;
}
