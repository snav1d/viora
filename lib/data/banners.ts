import "server-only";
import { prisma } from "@/lib/prisma";
import type { BannerPlacement } from "@/lib/generated/prisma/client";

/// The one banner live right now for a given slot, by the same date-window + isActive rule as
/// SeasonalTheme (docs/decisions.md ADR 36) - startsAt/endsAt are optional here (a standing
/// announcement needs no end date), so "in window" means "no bound set, or bound not yet passed"
/// on each side. If more than one banner is live for the same placement, the most recently
/// created one wins (only one banner renders per slot).
export async function getActiveBanner(placement: BannerPlacement) {
  const now = new Date();
  return prisma.banner.findFirst({
    where: {
      placement,
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
}
