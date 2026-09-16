import "server-only";
import { prisma } from "@/lib/prisma";

/// A seller's approved-return rate against every PAID order item they've ever fulfilled
/// (docs/decisions.md ADR 38) - shown on their admin profile as a purely informational stat plus
/// a visual warning past the configured threshold, never an automatic action.
export async function getSellerReturnStats(sellerId: string) {
  const [totalItems, approvedReturns] = await Promise.all([
    prisma.orderItem.count({ where: { sellerId, order: { paymentStatus: "PAID" } } }),
    prisma.orderItem.count({
      where: { sellerId, order: { paymentStatus: "PAID" }, returnStatus: "APPROVED" },
    }),
  ]);
  const rate = totalItems > 0 ? approvedReturns / totalItems : 0;
  return { totalItems, approvedReturns, rate };
}

/// Configurable via PlatformSetting, not hardcoded - same pattern as
/// lib/data/hub.ts's getHubMinDaysBeforeEvent(). Seeded as {"percent": 10}.
export async function getSellerReturnRateWarningThreshold(): Promise<number> {
  const row = await prisma.platformSetting.findUnique({
    where: { key: "seller_return_rate_warning_threshold" },
  });
  const value = row?.value as { percent?: number } | undefined;
  return (value?.percent ?? 10) / 100;
}
