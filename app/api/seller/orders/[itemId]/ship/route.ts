import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedSeller } from "@/lib/auth/seller";

const bodySchema = z.object({
  trackingCode: z.string().min(1).optional(),
});

type Params = { params: Promise<{ itemId: string }> };

export async function POST(request: Request, { params }: Params) {
  const seller = await requireApprovedSeller();
  if (!seller) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { itemId } = await params;
  const item = await prisma.orderItem.findFirst({
    where: { id: itemId, sellerId: seller.id },
    include: { order: { include: { items: true } } },
  });
  if (!item) {
    return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
  }
  if (item.shippedAt) {
    return NextResponse.json({ error: "این سفارش قبلاً ارسال شده است." }, { status: 400 });
  }
  // A MULTI_SELLER order's items go through the Viora hub instead (docs/decisions.md ADR 37) -
  // this route is only for a direct-to-customer SINGLE_SELLER item; never trust the client to
  // only call the matching route for what an item actually is.
  if (item.hubStatus !== null) {
    return NextResponse.json(
      { error: "این کالا باید از طریق «ارسال به مرکز ویورا» پردازش شود." },
      { status: 400 },
    );
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

    // Orders are hardcoded orderType SINGLE_SELLER today (docs/decisions.md ADR 20), but a cart
    // can still mix products from different sellers, so this only flips Order.status once every
    // item on it - not just this seller's own - has shipped, never on this one update alone.
    const stillUnshipped = item.order.items.some((other) => other.id !== item.id && !other.shippedAt);
    if (!stillUnshipped) {
      await tx.order.update({ where: { id: item.orderId }, data: { status: "SHIPPED" } });
    }
  });

  return NextResponse.json({ ok: true });
}
