import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { getPaymentProvider } from "@/lib/providers/payment";
import { validateCoupon } from "@/lib/data/coupons";

const bodySchema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1) })).min(1),
  shippingAddress: z.string().min(5),
  couponCode: z.string().trim().min(1).optional(),
  // Optional - only meaningful for the hub's minimum-lead-time warning (docs/decisions.md
  // ADR 37) shown to a seller on a MULTI_SELLER order's items. A customer who skips it just
  // means that warning shows generic text instead of a computed deadline; nothing else depends
  // on it, so it's never required here.
  eventDate: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ابتدا وارد شوید.", requiresAuth: true }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }

  const productIds = parsed.data.items.map((item) => item.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  if (products.length !== productIds.length) {
    return NextResponse.json({ error: "برخی محصولات دیگر موجود نیستند." }, { status: 400 });
  }

  // Prices/sellers are re-read from the DB, never trusted from the client. A seller's own
  // discountPrice (docs/decisions.md ADR 35) - when set - is simply the real price here: it
  // flows straight into unitPrice/splitAmount exactly like the regular price always has, since
  // it's the seller's own choice, not something a platform coupon should ever touch.
  const lines = parsed.data.items.map((item) => {
    const product = products.find((p) => p.id === item.productId)!;
    const unitPrice = (product.discountPrice ?? product.price).toNumber();
    return {
      productId: product.id,
      sellerId: product.sellerId,
      quantity: item.quantity,
      unitPrice,
      splitAmount: unitPrice * item.quantity,
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  // Never trust the client's own earlier /api/coupons/validate preview - re-verify everything
  // (still active, still within its window/limits, still meets minOrderAmount against the real
  // server-computed subtotal) at the moment of actually charging.
  let couponId: string | null = null;
  let discountAmount = 0;
  if (parsed.data.couponCode) {
    const result = await validateCoupon(parsed.data.couponCode, session.userId, subtotal);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    couponId = result.coupon.id;
    discountAmount = result.discountAmount;
  }

  const totalAmount = subtotal - discountAmount;

  // A cart mixing products from more than one seller goes through the Viora hub instead of each
  // seller shipping straight to the customer (panels-and-operations-spec.md §1) - orderType and
  // each item's starting hubStatus are derived from the real distinct-seller count here, never
  // trusted from the client. See docs/decisions.md ADR 37.
  const distinctSellerCount = new Set(lines.map((line) => line.sellerId)).size;
  const orderType = distinctSellerCount > 1 ? "MULTI_SELLER" : "SINGLE_SELLER";
  const startingHubStatus = orderType === "MULTI_SELLER" ? "PENDING_SELLER_SHIPMENT" : null;

  const order = await prisma.order.create({
    data: {
      userId: session.userId,
      orderType,
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      totalAmount,
      couponId,
      discountAmount,
      shippingAddress: parsed.data.shippingAddress,
      eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : null,
      items: {
        create: lines.map((line) => ({
          productId: line.productId,
          sellerId: line.sellerId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          splitAmount: line.splitAmount,
          hubStatus: startingHubStatus,
        })),
      },
    },
  });

  const charge = await getPaymentProvider().charge({ orderId: order.id, amount: totalAmount });

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: charge.success
      ? { paymentStatus: "PAID", status: "PROCESSING" }
      : { paymentStatus: "FAILED" },
  });

  return NextResponse.json({ ok: true, orderId: updated.id });
}
