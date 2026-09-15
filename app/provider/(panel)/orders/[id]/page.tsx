import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { AcceptOrderButton } from "@/components/provider/AcceptOrderButton";
import { ShipOrderForm } from "@/components/provider/ShipOrderForm";
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
        <div>
          <dt className="text-charcoal-muted">تیراژ</dt>
          <dd className="font-medium text-charcoal">{item.quantity.toLocaleString("fa-IR")} عدد</dd>
        </div>
        <div>
          <dt className="text-charcoal-muted">مبلغ</dt>
          <dd className="font-medium text-charcoal">
            {(toNumber(item.unitPrice) * item.quantity).toLocaleString("fa-IR")} تومان
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-charcoal-muted">تاریخ تحویل</dt>
          <dd className="font-medium text-charcoal">
            {item.isExpressDelivery && item.requestedDeliveryDate
              ? `فوری - ${new Date(item.requestedDeliveryDate).toLocaleDateString("fa-IR")}`
              : "عادی"}
          </dd>
        </div>
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
          <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
            <div>
              <dt className="text-charcoal-muted">نوع بادکنک</dt>
              <dd className="font-medium text-charcoal">
                {item.printFinish ? FINISH_LABELS[item.printFinish] : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-charcoal-muted">رنگ</dt>
              <dd className="font-medium text-charcoal">{item.printColor ?? "—"}</dd>
            </div>
            {item.customerNotes ? (
              <div className="col-span-2">
                <dt className="text-charcoal-muted">توضیحات مشتری</dt>
                <dd className="font-medium text-charcoal">{item.customerNotes}</dd>
              </div>
            ) : null}
          </dl>

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
            <div className="mt-auto">
              <ShipOrderForm itemId={item.id} />
            </div>
          )}
        </>
      )}
    </main>
  );
}
