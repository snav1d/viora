import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

const bodySchema = z.object({
  trackingCode: z.string({ error: "کد رهگیری را وارد کنید." }).trim().min(1, "کد رهگیری را وارد کنید."),
});

type Params = { params: Promise<{ itemId: string }> };

/// QUALITY_CHECK -> FINAL_SHIPPED: the moment a hub item genuinely ships to the customer, so
/// shippedAt is set here (not when the seller sent it to the hub) - the same "set = happened"
/// timestamp every other ship route uses, gating the customer's own delivery-confirmation/review
/// flow (ADR 33) exactly like a direct-ship item. See docs/decisions.md ADR 37.
export async function POST(request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { itemId } = await params;
  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { order: { include: { items: true } } },
  });
  if (!item) {
    return NextResponse.json({ error: "آیتم پیدا نشد." }, { status: 404 });
  }
  if (item.hubStatus !== "QUALITY_CHECK") {
    return NextResponse.json({ error: "این آیتم آماده‌ی ارسال نهایی نیست." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "اطلاعات وارد شده معتبر نیست." },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.update({
      where: { id: item.id },
      data: { hubStatus: "FINAL_SHIPPED", shippedAt: new Date(), trackingCode: parsed.data.trackingCode },
    });

    // Same "only flip Order.status once every item has shipped" convention as the direct-ship
    // routes (seller/provider) - a MULTI_SELLER order's items all go through the hub, so this
    // naturally fires once the last one is finalized.
    const stillUnshipped = item.order.items.some((other) => other.id !== item.id && !other.shippedAt);
    if (!stillUnshipped) {
      await tx.order.update({ where: { id: item.orderId }, data: { status: "SHIPPED" } });
    }
  });

  return NextResponse.json({ ok: true });
}
