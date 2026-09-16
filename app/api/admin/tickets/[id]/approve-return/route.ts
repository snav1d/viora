import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { createTicketMessage } from "@/lib/data/support";

type Params = { params: Promise<{ id: string }> };

/// Sets the ticket's OrderItem.returnStatus to APPROVED and posts an automatic staff message
/// with the seller's address and next steps - deliberately no shipping-cost refund flow, since
/// this codebase has no real payment/refund infrastructure to plug it into yet (docs/decisions.md
/// ADR 38): the message just states the cost is the seller's responsibility and points the
/// customer to coordinate directly.
export async function POST(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: { orderItem: { include: { seller: true } } },
  });
  if (!ticket || ticket.type !== "RETURN_REQUEST" || !ticket.orderItem) {
    return NextResponse.json({ error: "تیکت پیدا نشد." }, { status: 404 });
  }
  if (ticket.orderItem.returnStatus !== "REQUESTED") {
    return NextResponse.json({ error: "این درخواست مرجوعی در انتظار بررسی نیست." }, { status: 400 });
  }

  const addressLine = ticket.orderItem.seller?.address
    ? `آدرس فروشنده برای ارسال کالا:\n${ticket.orderItem.seller.address}`
    : "برای دریافت آدرس فروشنده جهت ارسال کالا، در همین گفتگو پیگیری کنید.";

  await prisma.$transaction([
    prisma.orderItem.update({ where: { id: ticket.orderItem.id }, data: { returnStatus: "APPROVED" } }),
  ]);
  await createTicketMessage({
    ticketId: ticket.id,
    authorId: admin.id,
    isFromStaff: true,
    body: `درخواست مرجوعی شما تایید شد.\n\n${addressLine}\n\nهزینه‌ی ارسال مرجوعی بر عهده‌ی فروشنده است؛ لطفاً برای هماهنگی نحوه‌ی ارسال مستقیماً با فروشنده در ارتباط باشید.`,
  });

  return NextResponse.json({ ok: true });
}
