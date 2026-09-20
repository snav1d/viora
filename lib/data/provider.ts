import "server-only";
import { prisma } from "@/lib/prisma";
import { PRINT_CATEGORY_SLUG } from "@/lib/serviceCategories";

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

export function getProviderPortfolio(providerId: string) {
  return prisma.providerPortfolioImage.findMany({
    where: { providerId },
    orderBy: { createdAt: "desc" },
  });
}

/// Print is the one category that still ever has exactly one ServiceOffering per provider (its
/// own registration route creates it, and there's no self-service way to add another) - used by
/// the print-only /provider/offering settings page (docs/decisions.md ADR 44, superseding ADR
/// 43's category-agnostic version now that "simple" categories have moved to
/// getMyServiceOfferings below). Filtered by category, not just providerId - a non-print
/// provider who has since created their own ServiceOfferings via /api/provider/services would
/// otherwise match here too (findFirst has no concept of "the right one" without this filter),
/// wrongly skipping the page's own redirect to /provider/services.
export function getMyPrintOffering(providerId: string) {
  return prisma.serviceOffering.findFirst({
    where: { providerId, category: { slug: PRINT_CATEGORY_SLUG } },
    include: { category: true, pricingTiers: true },
  });
}

/// Every one of a "simple" category provider's self-managed ServiceOfferings (docs/decisions.md
/// ADR 44) - unlike print, there can be any number of these, each independently titled/
/// described/priced, created/edited any time from /provider/services with no admin review per
/// offering (the provider itself was already approved).
export function getMyServiceOfferings(providerId: string) {
  return prisma.serviceOffering.findMany({
    where: { providerId },
    orderBy: { createdAt: "desc" },
  });
}

export function getMyServiceOfferingDetail(providerId: string, offeringId: string) {
  return prisma.serviceOffering.findFirst({ where: { id: offeringId, providerId } });
}
