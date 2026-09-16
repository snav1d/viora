import type { Metadata } from "next";
import { Package } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { ShipItemForm } from "@/components/seller/ShipItemForm";
import { SendToHubButton } from "@/components/seller/SendToHubButton";
import { getSellerProfile } from "@/lib/auth/seller";
import { getSellerOrderItems } from "@/lib/data/seller";
import { getHubMinDaysBeforeEvent } from "@/lib/data/hub";
import { toNumber } from "@/lib/decimal";
import { HUB_PROCESSING_STATUS_LABELS } from "@/lib/labels";
import { addDaysIso, formatJalaliLong, toPersianDigits } from "@/lib/jalali";

export const metadata: Metadata = {
  title: "سفارش‌ها",
  robots: { index: false, follow: false },
};

function hubDeadlineWarning(eventDate: Date | null, minDays: number): string {
  const days = toPersianDigits(minDays);
  if (!eventDate) {
    return `این کالا باید حداقل ${days} روز قبل از تاریخ جشن مشتری به مرکز پردازش ویورا برسد.`;
  }
  const deadlineIso = addDaysIso(eventDate.toISOString().slice(0, 10), -minDays);
  return `این کالا باید حداقل تا ${formatJalaliLong(deadlineIso)} (${days} روز قبل از تاریخ جشن) به مرکز پردازش ویورا برسد.`;
}

export default async function SellerOrdersPage() {
  // Never null here: the (panel) layout already redirected/blocked every other case before
  // rendering this page.
  const profile = (await getSellerProfile())!;
  const [items, hubMinDays] = await Promise.all([
    getSellerOrderItems(profile.id),
    getHubMinDaysBeforeEvent(),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title="سفارش‌های دریافتی" />

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
          <Package className="h-6 w-6 text-charcoal-muted" strokeWidth={1.5} />
          <p className="text-sm text-charcoal-muted">هنوز سفارشی دریافت نکرده‌اید.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-sm"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-charcoal">
                  سفارش <span dir="ltr">#{item.orderId.slice(-6).toUpperCase()}</span>
                </p>
                {item.hubStatus ? (
                  <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-medium text-gold-600">
                    {HUB_PROCESSING_STATUS_LABELS[item.hubStatus]}
                  </span>
                ) : item.shippedAt ? (
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                    ارسال شده
                  </span>
                ) : (
                  <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-medium text-gold-600">
                    آماده‌سازی
                  </span>
                )}
              </div>

              <p className="text-charcoal-muted">
                {item.product?.title ?? "محصول حذف‌شده"} × {item.quantity.toLocaleString("fa-IR")}
              </p>
              <p className="font-medium text-charcoal">
                {(toNumber(item.unitPrice) * item.quantity).toLocaleString("fa-IR")} تومان
              </p>

              {item.hubStatus === "PENDING_SELLER_SHIPMENT" ? (
                <div className="space-y-2 rounded-xl bg-gold-100/40 p-2.5">
                  <p className="text-xs text-charcoal-muted">
                    {hubDeadlineWarning(item.order.eventDate, hubMinDays)}
                  </p>
                  <SendToHubButton itemId={item.id} />
                </div>
              ) : item.hubStatus ? null : item.shippedAt ? (
                item.trackingCode ? (
                  <p dir="ltr" className="text-left text-xs text-charcoal-muted">
                    کد رهگیری: {item.trackingCode}
                  </p>
                ) : null
              ) : (
                <ShipItemForm itemId={item.id} />
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
