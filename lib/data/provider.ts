import "server-only";
import { prisma } from "@/lib/prisma";

// Orders still PENDING_PAYMENT/FAILED never reached the provider in real life, same reasoning as
// lib/data/seller.ts's identical filter (ADR 27) - a print order is only created after a
// successful mock payment (see app/api/print-orders/route.ts), but this stays defensive either
// way.
const paidOrderFilter = { order: { paymentStatus: "PAID" as const } };

export function getProviderOrderItems(providerId: string) {
  return prisma.orderItem.findMany({
    where: { providerId, ...paidOrderFilter },
    include: { order: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export function getProviderOrderItemDetail(providerId: string, itemId: string) {
  return prisma.orderItem.findFirst({
    where: { id: itemId, providerId, ...paidOrderFilter },
    include: { order: { include: { user: true } }, serviceOffering: true },
  });
}

export async function getProviderStats(providerId: string) {
  const [awaitingAcceptance, inProgress] = await Promise.all([
    prisma.orderItem.count({ where: { providerId, acceptedAt: null, ...paidOrderFilter } }),
    prisma.orderItem.count({
      where: { providerId, acceptedAt: { not: null }, shippedAt: null, ...paidOrderFilter },
    }),
  ]);
  return { awaitingAcceptance, inProgress };
}
