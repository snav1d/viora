import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import type { SeasonalTheme } from "@/lib/generated/prisma/client";

/// Not httpOnly-sensitive - it only ever names a theme id to preview, and getEffectiveTheme
/// always re-checks requireAdmin() before honoring it, so a non-admin setting this cookie on
/// themselves gains nothing. Set/cleared only via the admin-gated /api/admin/themes/[id]/preview
/// route, never read/written directly by client code.
export const THEME_PREVIEW_COOKIE = "viora_theme_preview";

/// The one theme live right now by date window, independent of any admin preview. Mirrors
/// lib/data/coupons.ts's validateCoupon date-window check (ADR 35) - checked live on every
/// request, since this project has no cron/background-job runner to flip a flag at midnight.
/// If more than one theme's window somehow overlaps today, the most recently *started* one wins
/// (an admin adding a shorter, more specific theme inside a longer one's window is the only
/// realistic way this happens, and should take precedence).
export async function getActiveSeasonalTheme(): Promise<SeasonalTheme | null> {
  const now = new Date();
  return prisma.seasonalTheme.findFirst({
    where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { startsAt: "desc" },
  });
}

/// What app/layout.tsx actually renders with: the live theme, unless an admin has a preview
/// cookie set for a specific (possibly not-yet-live, possibly inactive) theme - in which case
/// only that admin's own requests see it, never other visitors, and it's re-verified server-side
/// on every request rather than trusted from the cookie alone (same "never trust an earlier
/// read" posture as ADR 31/35).
export async function getEffectiveTheme(): Promise<{ theme: SeasonalTheme | null; isPreview: boolean }> {
  const cookieStore = await cookies();
  const previewId = cookieStore.get(THEME_PREVIEW_COOKIE)?.value;
  if (previewId) {
    const admin = await requireAdmin();
    if (admin) {
      const preview = await prisma.seasonalTheme.findUnique({ where: { id: previewId } });
      if (preview) {
        return { theme: preview, isPreview: true };
      }
    }
  }
  return { theme: await getActiveSeasonalTheme(), isPreview: false };
}
