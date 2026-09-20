import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { getServiceProviderProfile } from "@/lib/auth/provider";
import { getProviderOrderItems } from "@/lib/data/provider";

export const metadata: Metadata = {
  title: "سفارش‌ها",
  robots: { index: false, follow: false },
};

export default async function ProviderOrdersPage() {
  // Never null here: the (panel) layout already redirected/blocked every other case before
  // rendering this page.
  const profile = (await getServiceProviderProfile())!;
  const items = await getProviderOrderItems(profile.id);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title="سفارش‌های دریافتی" />

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
          <ClipboardList className="h-6 w-6 text-charcoal-muted" strokeWidth={1.5} />
          <p className="text-sm text-charcoal-muted">هنوز سفارشی دریافت نکرده‌اید.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/provider/orders/${item.id}`}
                className="flex flex-col gap-1.5 rounded-2xl border border-border bg-surface p-4 text-sm hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-charcoal">{item.order.user.name ?? "مشتری ویورا"}</p>
                  {item.shippedAt ? (
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                      ارسال شده
                    </span>
                  ) : item.reassignmentRequestedAt ? (
                    <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-medium text-gold-600">
                      در دسترس واگذاری
                    </span>
                  ) : item.acceptedAt ? (
                    <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-medium text-gold-600">
                      در حال آماده‌سازی
                    </span>
                  ) : (
                    <span className="rounded-full bg-border px-3 py-1 text-xs font-medium text-charcoal-muted">
                      در انتظار پذیرش
                    </span>
                  )}
                </div>
                {item.printFinish !== null ? (
                  <>
                    <p className="text-charcoal-muted">تیراژ: {item.quantity.toLocaleString("fa-IR")} عدد</p>
                    <p className="text-xs text-charcoal-muted">
                      {item.isExpressDelivery && item.requestedDeliveryDate
                        ? `تحویل فوری: ${new Date(item.requestedDeliveryDate).toLocaleDateString("fa-IR")}`
                        : "تحویل عادی"}
                    </p>
                  </>
                ) : item.order.eventDate ? (
                  <p className="text-charcoal-muted">
                    تاریخ رویداد: {new Date(item.order.eventDate).toLocaleDateString("fa-IR")}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
