import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { ConfirmDeliveryButton } from "@/components/orders/ConfirmDeliveryButton";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { StarRating } from "@/components/reviews/StarRating";
import { getSession } from "@/lib/auth/session";
import { getOrderDetailForUser } from "@/lib/data/orders";
import { toNumber } from "@/lib/decimal";
import { ORDER_STATUS_LABELS } from "@/lib/labels";

export const metadata: Metadata = {
  title: "جزئیات سفارش",
  robots: { index: false, follow: false },
};

// Order status, shipping/delivery timestamps, and review state all change from other panels
// (seller/provider ship, this same page's own confirm-delivery button) - must never be frozen
// at build time.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    redirect(`/auth?redirect=%2Forders%2F${id}`);
  }

  const order = await getOrderDetailForUser(id, session.userId);
  if (!order) notFound();

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 py-5">
      <TopBar title="جزئیات سفارش" backHref="/profile" />

      <section className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
        <div>
          <p className="font-medium text-charcoal">
            سفارش <span dir="ltr">#{order.id.slice(-6).toUpperCase()}</span>
          </p>
          <p className="text-sm text-charcoal-muted">
            {toNumber(order.totalAmount).toLocaleString("fa-IR")} تومان
          </p>
        </div>
        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </section>

      {order.status === "SHIPPED" ? <ConfirmDeliveryButton orderId={order.id} /> : null}

      <ul className="flex flex-col gap-3">
        {order.items.map((item) => {
          const title = item.product?.title ?? item.serviceOffering?.title ?? "آیتم سفارش";
          return (
            <li key={item.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between text-sm">
                <p className="font-medium text-charcoal">{title}</p>
                <p className="text-charcoal-muted">
                  {item.quantity.toLocaleString("fa-IR")} عدد ×{" "}
                  {toNumber(item.unitPrice).toLocaleString("fa-IR")} تومان
                </p>
              </div>

              {item.deliveredAt ? (
                item.review ? (
                  <div className="space-y-1 border-t border-border pt-3">
                    <p className="text-xs text-charcoal-muted">نظر شما</p>
                    <StarRating rating={item.review.rating} />
                    {item.review.comment ? (
                      <p className="text-sm text-charcoal">{item.review.comment}</p>
                    ) : null}
                  </div>
                ) : (
                  <ReviewForm orderItemId={item.id} />
                )
              ) : null}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
