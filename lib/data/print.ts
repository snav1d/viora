import "server-only";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
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

/** Every color any currently-qualifying print partner supports, deduped - what the customer
 * picks from, so a requested color always exactly matches some partner's own list instead of
 * relying on fragile free-text comparison. */
export async function getAvailablePrintColors(): Promise<string[]> {
  const offerings = await prisma.serviceOffering.findMany({
    where: activePrintOfferingFilter,
    select: { printableColors: true },
  });
  const colors = new Set<string>();
  for (const offering of offerings) {
    for (const color of parseColors(offering.printableColors)) colors.add(color);
  }
  return Array.from(colors).sort();
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

export async function getPrintDeliverySettings(): Promise<{ expressFee: number; normalTurnaroundText: string }> {
  const [feeRow, textRow] = await Promise.all([
    prisma.platformSetting.findUnique({ where: { key: "print_express_fee" } }),
    prisma.platformSetting.findUnique({ where: { key: "print_normal_turnaround_text" } }),
  ]);
  const feeValue = feeRow?.value as { amount?: number } | undefined;
  const textValue = textRow?.value as { text?: string } | undefined;
  return {
    expressFee: feeValue?.amount ?? 0,
    normalTurnaroundText: textValue?.text ?? "",
  };
}
