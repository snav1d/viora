import "server-only";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import { addDaysIso, todayIso } from "@/lib/jalali";
import type { BalloonFinish, Prisma } from "@/lib/generated/prisma/client";

function parseColors(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

// A print offering is only real/visible once its own provider is APPROVED (ServiceOffering.
// isActive alone isn't enough to trust - see docs/decisions.md ADR 31 on why isActive starts
// false at registration) and it actually has print settings configured (minOrderQuantity is
// null for a hypothetical future non-print ServiceOffering).
const activePrintOfferingFilter = {
  isActive: true,
  minOrderQuantity: { not: null },
  provider: { status: "APPROVED" as const },
};

/** The admin-curated color catalog (docs/decisions.md ADR 32) - both the provider registration
 * wizard's checkbox list and the customer order flow's color picker read from this exact same
 * list, so a color name always means the same thing on both sides. A color with no partner
 * currently supporting it is still shown here (matching can legitimately return zero partners,
 * already a handled UI state) rather than silently hidden, since hiding it would make the
 * catalog drift from what the admin panel actually shows as configured. */
export async function getPrintColorNames(): Promise<string[]> {
  const colors = await prisma.printColor.findMany({ orderBy: { name: "asc" } });
  return colors.map((c) => c.name);
}

export type MatchedPrintProvider = {
  offeringId: string;
  providerId: string;
  businessName: string;
  unitPrice: number;
  totalPrice: number;
  completedOrderCount: number;
  isVerifiedByViora: boolean;
};

/** panels-and-operations-spec.md §3's matching step: partners who (a) support the requested
 * finish, (b) support the requested color, (c) accept this quantity (at or above their own
 * minimum), ranked by "تاییدیه‌ی ویژه‌ی ویورا" first (docs/decisions.md ADR 42's positive ranking
 * weight for the badge), then completed-order count as the tiebreaker - a real star rating is
 * still out of scope for this phase. */
export async function getMatchingPrintProviders(params: {
  cityId: string;
  finish: BalloonFinish;
  color: string;
  quantity: number;
}): Promise<MatchedPrintProvider[]> {
  const offerings = await prisma.serviceOffering.findMany({
    where: {
      ...activePrintOfferingFilter,
      cityId: params.cityId,
      minOrderQuantity: { lte: params.quantity },
      ...(params.finish === "CHROME" ? { supportsChrome: true } : { supportsMatte: true }),
    },
    include: { provider: true, pricingTiers: true },
  });

  const matched = offerings.filter((offering) => parseColors(offering.printableColors).includes(params.color));

  const results: MatchedPrintProvider[] = [];
  for (const offering of matched) {
    const tier = offering.pricingTiers.find(
      (t) => params.quantity >= t.minQuantity && (t.maxQuantity === null || params.quantity <= t.maxQuantity),
    );
    if (!tier) continue; // no tier covers this quantity - not actually a match

    const completedOrderCount = await prisma.orderItem.count({
      where: { providerId: offering.providerId, shippedAt: { not: null } },
    });

    const unitPrice = toNumber(tier.unitPrice);
    results.push({
      offeringId: offering.id,
      providerId: offering.providerId,
      businessName: offering.provider.businessName,
      unitPrice,
      totalPrice: unitPrice * params.quantity,
      completedOrderCount,
      isVerifiedByViora: offering.provider.isVerifiedByViora,
    });
  }

  return results.sort((a, b) => {
    if (a.isVerifiedByViora !== b.isVerifiedByViora) return a.isVerifiedByViora ? -1 : 1;
    return b.completedOrderCount - a.completedOrderCount;
  });
}

type PrintOfferingWithTiers = Prisma.ServiceOfferingGetPayload<{ include: { pricingTiers: true } }>;

/** Shared by getAvailableReassignmentOrders (list) and claimReassignmentItem (act on one) so both
 * always agree on exactly which orders a given offering can actually take - see
 * getMatchingPrintProviders's own matching rules, applied here against one offering instead of
 * ranking many. */
function offeringCanTakeItem(
  offering: PrintOfferingWithTiers,
  item: { quantity: number; printFinish: BalloonFinish | null; printColor: string | null },
): boolean {
  if (!item.printFinish || !item.printColor) return false;
  if (item.quantity < offering.minOrderQuantity!) return false;
  if (item.printFinish === "CHROME" ? !offering.supportsChrome : !offering.supportsMatte) return false;
  if (!parseColors(offering.printableColors).includes(item.printColor)) return false;
  return offering.pricingTiers.some(
    (tier) => item.quantity >= tier.minQuantity && (tier.maxQuantity === null || item.quantity <= tier.maxQuantity),
  );
}

/** A provider only ever has one active print ServiceOffering in this phase (see the registration
 * flow, which creates exactly one), so there's no ambiguity about "which of my offerings". */
function getMyActivePrintOffering(providerId: string) {
  return prisma.serviceOffering.findFirst({
    where: { providerId, ...activePrintOfferingFilter },
    include: { pricingTiers: true },
  });
}

/** panels-and-operations-spec.md's "بازار واگذاری سفارش" (docs/decisions.md ADR 42): every print
 * OrderItem another provider has put up for reassignment, filtered down to the ones this
 * provider's own offering could actually take. */
export async function getAvailableReassignmentOrders(providerId: string) {
  const myOffering = await getMyActivePrintOffering(providerId);
  if (!myOffering) return [];

  const candidates = await prisma.orderItem.findMany({
    where: {
      reassignmentRequestedAt: { not: null },
      providerId: { not: providerId },
      shippedAt: null,
      order: { paymentStatus: "PAID" },
    },
    orderBy: { reassignmentRequestedAt: "asc" },
  });

  return candidates.filter((item) => offeringCanTakeItem(myOffering, item));
}

/** Claims one specific up-for-reassignment OrderItem for this provider - re-validates everything
 * server-side (never trusts an earlier /available-orders list fetch) and reassigns
 * providerId/serviceOfferingId/acceptedAt together, atomically. The `updateMany`'s own
 * `reassignmentRequestedAt: { not: null }` guard is what makes this race-safe: MySQL row-locks the
 * row for the update's duration, so if two providers claim the same item at once, only the first
 * actually changes anything - the loser's `count` comes back 0. */
export async function claimReassignmentItem(
  providerId: string,
  itemId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const myOffering = await getMyActivePrintOffering(providerId);
  if (!myOffering) {
    return { ok: false, error: "شما پیشنهاد چاپ فعالی ندارید." };
  }

  const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
  if (!item || !item.reassignmentRequestedAt || item.providerId === providerId) {
    return { ok: false, error: "این سفارش دیگر برای واگذاری در دسترس نیست." };
  }
  if (!offeringCanTakeItem(myOffering, item)) {
    return { ok: false, error: "این سفارش با پیشنهاد چاپ شما مطابقت ندارد." };
  }

  const result = await prisma.orderItem.updateMany({
    where: { id: item.id, reassignmentRequestedAt: { not: null } },
    data: {
      providerId,
      serviceOfferingId: myOffering.id,
      acceptedAt: new Date(),
      reassignmentRequestedAt: null,
    },
  });
  if (result.count === 0) {
    return { ok: false, error: "این سفارش توسط پارتنر دیگری برداشته شد." };
  }

  return { ok: true };
}

/** normalDeliveryFromDate/ToDate are real calendar dates (today + the configured day range),
 * computed once per request here rather than shipping the raw day counts to the client - a
 * relative description ("۳ تا ۵ روز کاری") doesn't tell a customer *which* dates to expect, so
 * this resolves it against "today" server-side and the caller just formats/displays it. See
 * docs/decisions.md ADR 32. */
export async function getPrintDeliverySettings(): Promise<{
  expressFee: number;
  normalDeliveryFromDate: string;
  normalDeliveryToDate: string;
}> {
  const [feeRow, daysRow] = await Promise.all([
    prisma.platformSetting.findUnique({ where: { key: "print_express_fee" } }),
    prisma.platformSetting.findUnique({ where: { key: "print_normal_turnaround_days" } }),
  ]);
  const feeValue = feeRow?.value as { amount?: number } | undefined;
  const daysValue = daysRow?.value as { minDays?: number; maxDays?: number } | undefined;
  const today = todayIso();
  return {
    expressFee: feeValue?.amount ?? 0,
    normalDeliveryFromDate: addDaysIso(today, daysValue?.minDays ?? 3),
    normalDeliveryToDate: addDaysIso(today, daysValue?.maxDays ?? 5),
  };
}
