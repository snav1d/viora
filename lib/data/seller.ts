import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Product.images is stored as Json (MySQL has no native scalar-list column - ADR 20), same
 * reasoning as lib/auth/roles.ts's parseRoles for User.roles. */
export function parseProductImages(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export function getSellerProducts(sellerId: string, filters: { q?: string; status?: "active" | "inactive" } = {}) {
  return prisma.product.findMany({
    where: {
      sellerId,
      ...(filters.q ? { title: { contains: filters.q } } : {}),
      ...(filters.status ? { isActive: filters.status === "active" } : {}),
    },
    include: { category: true, city: true },
    orderBy: { createdAt: "desc" },
  });
}

export function getSellerProductById(sellerId: string, productId: string) {
  return prisma.product.findFirst({ where: { id: productId, sellerId } });
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
    prisma.product.count({ where: { sellerId, isActive: true } }),
    prisma.orderItem.count({ where: { sellerId, shippedAt: null, ...paidOrderFilter } }),
  ]);
  return { activeProducts, pendingItems };
}
