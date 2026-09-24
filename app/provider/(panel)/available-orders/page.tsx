import type { Metadata } from "next";
import { Boxes } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { ClaimOrderButton } from "@/components/provider/ClaimOrderButton";
import { getServiceProviderProfile } from "@/lib/auth/provider";
import { getAvailableReassignmentOrders } from "@/lib/data/print";
import { toNumber } from "@/lib/decimal";

export const metadata: Metadata = {
  title: "سفارش‌های در دسترس",
  robots: { index: false, follow: false },
};

// Another provider could request/claim a reassignment at any moment - never cached/frozen at
// build time, same reasoning as every other live-queue page in this app.
export const dynamic = "force-dynamic";

const FINISH_LABELS = { CHROME: "کروم", MATTE: "مات" } as const;

export default async function AvailableOrdersPage() {
  // Never null here: the (panel) layout already redirected/blocked every other case before
  // rendering this page.
  const profile = (await getServiceProviderProfile())!;
  const items = await getAvailableReassignmentOrders(profile.id);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title="سفارش‌های در دسترس" />
      <p className="text-sm leading-6 text-charcoal-muted">
        سفارش‌هایی که یک پارتنر دیگر پذیرفته ولی درخواست واگذاری داده - هرکدوم را که اول قبول
        کنید، مالکیت آن به شما منتقل می‌شود. جزئیات کامل (فایل طرح و توضیحات مشتری) پس از پذیرش
        شما نمایش داده می‌شود.
      </p>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
          <Boxes className="h-6 w-6 text-charcoal-muted" strokeWidth={1.5} />
          <p className="text-sm text-charcoal-muted">فعلاً سفارشی برای واگذاری در دسترس نیست.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-charcoal">
                  {item.printFinish ? FINISH_LABELS[item.printFinish] : "—"} · {item.printColor ?? "—"}
                </p>
                <p className="font-semibold text-charcoal">
                  {(toNumber(item.unitPrice) * item.quantity).toLocaleString("fa-IR")} تومان
                </p>
              </div>
              <p className="text-charcoal-muted">تیراژ: {item.quantity.toLocaleString("fa-IR")} عدد</p>
              <p className="text-xs text-charcoal-muted">
                {item.isExpressDelivery && item.requestedDeliveryDate
                  ? `تحویل فوری: ${new Date(item.requestedDeliveryDate).toLocaleDateString("fa-IR")}`
                  : "تحویل عادی"}
              </p>
              <ClaimOrderButton itemId={item.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
