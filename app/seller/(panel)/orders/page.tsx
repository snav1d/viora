import type { Metadata } from "next";
import { Package } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { ShipItemForm } from "@/components/seller/ShipItemForm";
import { getSellerProfile } from "@/lib/auth/seller";
import { getSellerOrderItems } from "@/lib/data/seller";
import { toNumber } from "@/lib/decimal";

export const metadata: Metadata = {
  title: "سفارش‌ها",
  robots: { index: false, follow: false },
};

export default async function SellerOrdersPage() {
  // Never null here: the (panel) layout already redirected/blocked every other case before
  // rendering this page.
  const profile = (await getSellerProfile())!;
  const items = await getSellerOrderItems(profile.id);

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
                {item.shippedAt ? (
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

              {item.shippedAt ? (
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
