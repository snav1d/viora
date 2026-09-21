import type { Metadata } from "next";
import Link from "next/link";
import { Ticket, Plus } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { ActiveToggle } from "@/components/admin/ActiveToggle";
import { BirthdayCampaignSettingsForm } from "@/components/admin/BirthdayCampaignSettingsForm";
import { getAllCoupons } from "@/lib/data/admin";
import { getBirthdayCampaignSettings } from "@/lib/data/birthdayCampaign";
import { COUPON_TYPE_LABELS } from "@/lib/labels";
import { toNumber } from "@/lib/decimal";

export const metadata: Metadata = {
  title: "کدهای تخفیف",
  robots: { index: false, follow: false },
};

// Coupon.isActive changes from this very panel - must never be cached at build time.
export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const [coupons, birthdaySettings] = await Promise.all([getAllCoupons(), getBirthdayCampaignSettings()]);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title="کدهای تخفیف" />

      <BirthdayCampaignSettingsForm initialType={birthdaySettings.type} initialValue={birthdaySettings.value} />

      <Link
        href="/admin/coupons/new"
        className="flex items-center justify-center gap-2 rounded-full bg-gold-500 px-6 py-3.5 text-base font-medium text-charcoal hover:bg-gold-600"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        کد تخفیف جدید
      </Link>

      {coupons.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
          <Ticket className="h-6 w-6 text-charcoal-muted" strokeWidth={1.5} />
          <p className="text-sm text-charcoal-muted">هنوز کد تخفیفی ثبت نشده است.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {coupons.map((coupon) => (
            <li
              key={coupon.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 text-sm"
            >
              <div className="space-y-1">
                <p dir="ltr" className="text-left font-medium text-charcoal">
                  {coupon.code}
                </p>
                <p className="text-charcoal-muted">
                  {COUPON_TYPE_LABELS[coupon.type]} ·{" "}
                  {coupon.type === "PERCENTAGE"
                    ? `${toNumber(coupon.value).toLocaleString("fa-IR")}٪`
                    : `${toNumber(coupon.value).toLocaleString("fa-IR")} تومان`}
                </p>
              </div>
              <ActiveToggle id={coupon.id} isActive={coupon.isActive} kind="coupons" />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
