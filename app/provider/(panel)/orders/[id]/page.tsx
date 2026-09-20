import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { AcceptOrderButton } from "@/components/provider/AcceptOrderButton";
import { ShipOrderForm } from "@/components/provider/ShipOrderForm";
import { RequestReassignmentButton } from "@/components/provider/RequestReassignmentButton";
import { getServiceProviderProfile } from "@/lib/auth/provider";
import { getProviderOrderItemDetail } from "@/lib/data/provider";
import { toNumber } from "@/lib/decimal";

export const metadata: Metadata = {
  title: "جزئیات سفارش",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const FINISH_LABELS = { CHROME: "کروم", MATTE: "مات" } as const;

type Props = { params: Promise<{ id: string }> };

export default async function ProviderOrderDetailPage({ params }: Props) {
  const { id } = await params;
  // Never null here: the (panel) layout already redirected/blocked every other case before
  // rendering this page.
  const profile = (await getServiceProviderProfile())!;
  const item = await getProviderOrderItemDetail(profile.id, id);
  if (!item) notFound();

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 py-5">
      <TopBar title="جزئیات سفارش" backHref="/provider/orders" />

      <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
        <div className="col-span-2">
          <dt className="text-charcoal-muted">مشتری</dt>
          <dd className="font-medium text-charcoal">{item.order.user.name ?? "مشتری ویورا"}</dd>
        </div>
        {item.printFinish !== null ? (
          <div>
            <dt className="text-charcoal-muted">تیراژ</dt>
            <dd className="font-medium text-charcoal">{item.quantity.toLocaleString("fa-IR")} عدد</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-charcoal-muted">مبلغ</dt>
          <dd className="font-medium text-charcoal">
            {(toNumber(item.unitPrice) * item.quantity).toLocaleString("fa-IR")} تومان
          </dd>
        </div>
        {item.printFinish !== null ? (
          <div className="col-span-2">
            <dt className="text-charcoal-muted">تاریخ تحویل</dt>
            <dd className="font-medium text-charcoal">
              {item.isExpressDelivery && item.requestedDeliveryDate
                ? `فوری - ${new Date(item.requestedDeliveryDate).toLocaleDateString("fa-IR")}`
                : "عادی"}
            </dd>
          </div>
        ) : item.order.eventDate ? (
          <div className="col-span-2">
            <dt className="text-charcoal-muted">تاریخ رویداد</dt>
            <dd className="font-medium text-charcoal">
              {new Date(item.order.eventDate).toLocaleDateString("fa-IR")}
            </dd>
          </div>
        ) : null}
        {item.order.shippingAddress ? (
          <div className="col-span-2">
            <dt className="text-charcoal-muted">آدرس محل برگزاری</dt>
            <dd className="font-medium text-charcoal">{item.order.shippingAddress}</dd>
          </div>
        ) : null}
      </dl>

      {!item.acceptedAt ? (
        <>
          <p className="text-sm leading-7 text-charcoal-muted">
            جزئیات کامل این سفارش (فایل طرح، رنگ، توضیحات مشتری) پس از پذیرش شما نمایش داده
            می‌شود.
          </p>
          <div className="mt-auto">
            <AcceptOrderButton itemId={item.id} />
          </div>
        </>
      ) : (
        <>
          {item.printFinish !== null || item.customerNotes ? (
            <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
              {item.printFinish !== null ? (
                <>
                  <div>
                    <dt className="text-charcoal-muted">نوع بادکنک</dt>
                    <dd className="font-medium text-charcoal">{FINISH_LABELS[item.printFinish]}</dd>
                  </div>
                  <div>
                    <dt className="text-charcoal-muted">رنگ</dt>
                    <dd className="font-medium text-charcoal">{item.printColor ?? "—"}</dd>
                  </div>
                </>
              ) : null}
              {item.customerNotes ? (
                <div className="col-span-2">
                  <dt className="text-charcoal-muted">توضیحات مشتری</dt>
                  <dd className="font-medium text-charcoal">{item.customerNotes}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {item.designFileUrl ? (
            <a
              href={item.designFileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center rounded-2xl border border-border bg-surface py-3 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              دانلود فایل طرح
            </a>
          ) : null}

          {item.shippedAt ? (
            <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
              <p className="font-medium text-rose-700">تحویل نهایی ثبت شده است.</p>
              {item.trackingCode ? (
                <p dir="ltr" className="mt-1 text-left text-xs text-charcoal-muted">
                  کد رهگیری: {item.trackingCode}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-auto flex flex-col gap-3">
              {/* "بازار واگذاری سفارش" only ever matches print orders (docs/decisions.md ADR 42's
                  matching logic is print-shaped) - never offer it for a non-print order, which no
                  other partner could ever actually claim. See ADR 43. */}
              {item.printFinish !== null &&
                (item.reassignmentRequestedAt ? (
                  <p className="rounded-2xl border border-gold-200 bg-gold-100/60 p-3 text-center text-xs text-gold-600">
                    این سفارش برای واگذاری به پارتنرهای دیگر در دسترس قرار گرفته است - تا وقتی کسی
                    آن را نپذیرفته، همچنان می‌توانید خودتان تحویل نهایی را ثبت کنید.
                  </p>
                ) : (
                  <RequestReassignmentButton itemId={item.id} />
                ))}
              <ShipOrderForm itemId={item.id} />
            </div>
          )}
        </>
      )}
    </main>
  );
}
