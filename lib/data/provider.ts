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

/// "پورتفولیو" cap (docs/decisions.md ADR 43) - enforced here (both the upload route and the
/// panel UI import this same constant) rather than in the schema, since Prisma has no row-count
/// constraint.
export const MAX_PORTFOLIO_IMAGES = 15;

export function getProviderPortfolio(providerId: string) {
  return prisma.providerPortfolioImage.findMany({
    where: { providerId },
    orderBy: { createdAt: "desc" },
  });
}

/// A provider only ever has one ServiceOffering in this phase (see every registration route,
/// which creates exactly one) - used by the offering-settings page (docs/decisions.md ADR 43) to
/// show/edit it regardless of category (print keeps its pricingTiers; a "simple" category reads
/// basePrice/customFieldsSchema directly off the offering itself).
export function getMyServiceOffering(providerId: string) {
  return prisma.serviceOffering.findFirst({
    where: { providerId },
    include: { category: true, pricingTiers: true },
  });
}
