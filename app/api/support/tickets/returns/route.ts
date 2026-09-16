import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { storageUrlSchema } from "@/lib/validation/url";

const bodySchema = z.object({
  orderItemId: z.string({ error: "سفارش نامعتبر است." }).min(1, "سفارش نامعتبر است."),
  reason: z.string({ error: "دلیل مرجوعی را وارد کنید." }).trim().min(1, "دلیل مرجوعی را وارد کنید."),
  imageUrl: storageUrlSchema.optional(),
});

/// Creates a RETURN_REQUEST SupportTicket wired to a specific OrderItem, with the customer's
/// reason (+ optional photo) as the first message, and marks the item REQUESTED - all in one
/// transaction (docs/decisions.md ADR 38). A dedicated route rather than reusing the generic
/// /api/support/tickets POST, since a return needs its own validation (delivered, not already
/// requested, actually owned by this customer) and a second write (OrderItem.returnStatus) the
/// generic ticket-creation flow has no reason to know about.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ابتدا وارد شوید.", requiresAuth: true }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "اطلاعات وارد شده معتبر نیست." },
      { status: 400 },
    );
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: parsed.data.orderItemId },
    include: { order: true, product: true },
  });
  if (!item || item.order.userId !== session.userId) {
    return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
  }
  if (!item.sellerId) {
    return NextResponse.json({ error: "این نوع سفارش قابل مرجوعی نیست." }, { status: 400 });
  }
  if (!item.deliveredAt) {
    return NextResponse.json({ error: "این سفارش هنوز تحویل داده نشده است." }, { status: 400 });
  }
  if (item.returnStatus) {
    return NextResponse.json({ error: "برای این مورد قبلاً درخواست مرجوعی ثبت شده است." }, { status: 400 });
  }

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.supportTicket.create({
      data: {
        userId: session.userId,
        subject: `درخواست مرجوعی — ${item.product?.title ?? "کالا"}`,
        type: "RETURN_REQUEST",
        orderItemId: item.id,
        messages: {
          create: [{ authorId: session.userId, body: parsed.data.reason, imageUrl: parsed.data.imageUrl }],
        },
      },
    });
    await tx.orderItem.update({ where: { id: item.id }, data: { returnStatus: "REQUESTED" } });
    return created;
  });

  return NextResponse.json({ ok: true, ticketId: ticket.id });
}
