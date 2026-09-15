import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ابتدا وارد شوید.", requiresAuth: true }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findFirst({ where: { id, userId: session.userId } });
  if (!order) {
    return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
  }
  if (order.status !== "SHIPPED") {
    return NextResponse.json(
      { error: "این سفارش هنوز ارسال نشده یا قبلاً تحویل داده شده است." },
      { status: 400 },
    );
  }

  // By the time an order reaches SHIPPED, every item on it already has shippedAt set (the
  // seller/provider ship routes only flip Order.status once that's true) - so confirming
  // delivery is a plain one-shot update on every item, not the incremental "only flip once
  // everything's done" logic those ship routes need.
  await prisma.$transaction([
    prisma.orderItem.updateMany({
      where: { orderId: id, deliveredAt: null },
      data: { deliveredAt: new Date() },
    }),
    prisma.order.update({ where: { id }, data: { status: "DELIVERED" } }),
  ]);

  return NextResponse.json({ ok: true });
}
