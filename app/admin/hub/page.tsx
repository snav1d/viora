import type { Metadata } from "next";
import { Boxes } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { ApproveButton } from "@/components/admin/ApproveButton";
import { FinalizeHubItemForm } from "@/components/admin/FinalizeHubItemForm";
import { getHubQueueItems } from "@/lib/data/hub";
import { toNumber } from "@/lib/decimal";
import { HUB_PROCESSING_STATUS_LABELS } from "@/lib/labels";
import { formatJalaliLong } from "@/lib/jalali";

export const metadata: Metadata = {
  title: "مرکز پردازش ویورا",
  robots: { index: false, follow: false },
};

// A hub item's own status changes from this very panel and from the seller panel's own
// send-to-hub action - must never be cached at build time.
export const dynamic = "force-dynamic";

export default async function AdminHubPage() {
  const items = await getHubQueueItems();

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title="مرکز پردازش ویورا" />

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
          <Boxes className="h-6 w-6 text-charcoal-muted" strokeWidth={1.5} />
          <p className="text-sm text-charcoal-muted">در حال حاضر آیتمی در مرکز پردازش نیست.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-charcoal">
                  سفارش <span dir="ltr">#{item.orderId.slice(-6).toUpperCase()}</span>
                </p>
                <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-medium text-gold-600">
                  {HUB_PROCESSING_STATUS_LABELS[item.hubStatus!]}
                </span>
              </div>

              <p className="text-charcoal-muted">
                {item.product?.title ?? "محصول حذف‌شده"} × {item.quantity.toLocaleString("fa-IR")} —{" "}
                {item.seller?.businessName ?? "فروشنده حذف‌شده"}
              </p>
              <p className="font-medium text-charcoal">
                {(toNumber(item.unitPrice) * item.quantity).toLocaleString("fa-IR")} تومان
              </p>
              {item.order.eventDate ? (
                <p className="text-xs text-charcoal-muted">
                  تاریخ جشن: {formatJalaliLong(item.order.eventDate.toISOString().slice(0, 10))}
                </p>
              ) : null}

              {item.hubStatus === "RECEIVED_AT_HUB" ? (
                <ApproveButton
                  endpoint={`/api/admin/hub-items/${item.id}/start-quality-check`}
                  label="شروع کنترل کیفیت"
                />
              ) : (
                <FinalizeHubItemForm itemId={item.id} />
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
