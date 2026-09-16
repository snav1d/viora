import "server-only";
import { prisma } from "@/lib/prisma";

/// The hub's minimum lead time (panels-and-operations-spec.md §1's "بافر زمانی") - configurable
/// via PlatformSetting, not hardcoded, same pattern as lib/data/print.ts's
/// getPrintDeliverySettings(). Seeded as {"days": 2} (prisma/seed.ts); falls back to 2 if the row
/// is ever missing. Informational only for now (docs/decisions.md ADR 37) - shown as a warning to
/// the seller, never enforced as a hard validation.
export async function getHubMinDaysBeforeEvent(): Promise<number> {
  const row = await prisma.platformSetting.findUnique({ where: { key: "hub_min_days_before_event" } });
  const value = row?.value as { days?: number } | undefined;
  return value?.days ?? 2;
}

/// Every OrderItem currently sitting in the hub pipeline (sent by its seller, not yet given a
/// final tracking code) - the admin queue at /admin/hub. Only PAID orders (an unpaid MULTI_SELLER
/// order's items never really entered the hub, same paidOrderFilter convention as
/// lib/data/seller.ts).
export function getHubQueueItems() {
  return prisma.orderItem.findMany({
    where: {
      hubStatus: { in: ["RECEIVED_AT_HUB", "QUALITY_CHECK"] },
      order: { paymentStatus: "PAID" },
    },
    include: { product: true, seller: true, order: true },
    orderBy: { createdAt: "asc" },
  });
}
