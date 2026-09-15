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
};

/** panels-and-operations-spec.md §3's matching step: partners who (a) support the requested
 * finish, (b) support the requested color, (c) accept this quantity (at or above their own
 * minimum), ranked by completed-order count (a real signal to show today) since the "تاییدیه‌ی
 * ویژه"/real star rating this section also describes are both out of scope for this phase. */
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
    });
  }

  return results.sort((a, b) => b.completedOrderCount - a.completedOrderCount);
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
