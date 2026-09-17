import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Product.images is stored as Json (MySQL has no native scalar-list column - ADR 20), same
 * reasoning as lib/auth/roles.ts's parseRoles for User.roles. */
export function parseProductImages(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** A seller's own "my products" list is really their Listings (docs/decisions.md ADR 39) - one
 * row per catalog Product they currently offer, including a still-PENDING_REVIEW/NEEDS_REVISION
 * submission's own (inactive-until-approved) Listing, so a seller's own pending submissions show
 * up in the same list rather than needing a separate view. */
export function getSellerListings(
  sellerId: string,
  filters: { q?: string; status?: "active" | "inactive" } = {},
) {
  return prisma.listing.findMany({
    where: {
      sellerId,
      ...(filters.q ? { product: { title: { contains: filters.q } } } : {}),
      ...(filters.status ? { isActive: filters.status === "active" } : {}),
    },
    include: { product: { include: { category: true } }, city: true },
    orderBy: { createdAt: "desc" },
  });
}

export function getSellerListingById(sellerId: string, listingId: string) {
  return prisma.listing.findFirst({
    where: { id: listingId, sellerId },
    include: { product: true, city: true },
  });
}

// Orders still PENDING_PAYMENT/FAILED never reached the seller in real life (checkout only
// marks an order PROCESSING once payment succeeds) - excluded here so a seller's queue never
// shows an order they have no business fulfilling yet.
const paidOrderFilter = { order: { paymentStatus: "PAID" as const } };

export function getSellerOrderItems(sellerId: string) {
  return prisma.orderItem.findMany({
    where: { sellerId, ...paidOrderFilter },
    include: { product: true, order: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSellerStats(sellerId: string) {
  const [activeProducts, pendingItems] = await Promise.all([
    prisma.listing.count({ where: { sellerId, isActive: true } }),
    // Once an item has been sent to the Viora hub (hubStatus past PENDING_SELLER_SHIPMENT), it's
    // out of this seller's hands - "پنding" here means "this seller still needs to act on it".
    prisma.orderItem.count({
      where: {
        sellerId,
        shippedAt: null,
        OR: [{ hubStatus: null }, { hubStatus: "PENDING_SELLER_SHIPMENT" }],
        ...paidOrderFilter,
      },
    }),
  ]);
  return { activeProducts, pendingItems };
}
