import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedProvider } from "@/lib/auth/provider";

const bodySchema = z.object({
  trackingCode: z.string().min(1).optional(),
});

type Params = { params: Promise<{ itemId: string }> };

export async function POST(request: Request, { params }: Params) {
  const provider = await requireApprovedProvider();
  if (!provider) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { itemId } = await params;
  const item = await prisma.orderItem.findFirst({
    where: { id: itemId, providerId: provider.id },
    include: { order: { include: { items: true } } },
  });
  if (!item) {
    return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
  }
  if (!item.acceptedAt) {
    return NextResponse.json({ error: "ابتدا باید سفارش را بپذیرید." }, { status: 400 });
  }
  if (item.shippedAt) {
    return NextResponse.json({ error: "این سفارش قبلاً ارسال شده است." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "کد رهگیری نامعتبر است." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.update({
      where: { id: item.id },
      data: { shippedAt: new Date(), trackingCode: parsed.data.trackingCode },
    });

    // Same "only flip Order.status once every item has shipped" logic as
    // app/api/seller/orders/[itemId]/ship/route.ts (ADR 27) - a cart/order could in principle mix
    // a product line and a service line.
    const stillUnshipped = item.order.items.some((other) => other.id !== item.id && !other.shippedAt);
    if (!stillUnshipped) {
      await tx.order.update({ where: { id: item.orderId }, data: { status: "SHIPPED" } });
    }
  });

  return NextResponse.json({ ok: true });
}
