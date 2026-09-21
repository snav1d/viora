import "server-only";
import { prisma } from "@/lib/prisma";
import type { CouponType } from "@/lib/generated/prisma/client";

export type BirthdayCampaignSettings = { type: CouponType; value: number };

const SETTING_KEY = "birthday_discount_campaign";

const DEFAULT_SETTINGS: BirthdayCampaignSettings = { type: "PERCENTAGE", value: 10 };

/// Admin-configurable birthday-discount campaign (docs/decisions.md ADR 45) - whole-order only
/// (the confirmed answer to this phase's clarifying question ruled out a per-product scope as
/// out of scope for now), same PlatformSetting-as-flexible-config convention as
/// getPrintDeliverySettings. Falls back to a sane default so the campaign works even before an
/// admin has ever touched its settings page.
export async function getBirthdayCampaignSettings(): Promise<BirthdayCampaignSettings> {
  const row = await prisma.platformSetting.findUnique({ where: { key: SETTING_KEY } });
  const value = row?.value as Partial<BirthdayCampaignSettings> | undefined;
  if ((value?.type === "PERCENTAGE" || value?.type === "FIXED_AMOUNT") && typeof value.value === "number") {
    return { type: value.type, value: value.value };
  }
  return DEFAULT_SETTINGS;
}

export async function setBirthdayCampaignSettings(settings: BirthdayCampaignSettings): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: settings },
    create: { key: SETTING_KEY, value: settings },
  });
}
