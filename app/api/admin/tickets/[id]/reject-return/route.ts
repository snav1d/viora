import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { createTicketMessage } from "@/lib/data/support";

const bodySchema = z.object({
  reason: z.string({ error: "دلیل رد را وارد کنید." }).min(1, "دلیل رد را وارد کنید."),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: { orderItem: true },
  });
  if (!ticket || ticket.type !== "RETURN_REQUEST" || !ticket.orderItem) {
    return NextResponse.json({ error: "تیکت پیدا نشد." }, { status: 404 });
  }
  if (ticket.orderItem.returnStatus !== "REQUESTED") {
    return NextResponse.json({ error: "این درخواست مرجوعی در انتظار بررسی نیست." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "درخواست نامعتبر است." },
      { status: 400 },
    );
  }

  await prisma.orderItem.update({
    where: { id: ticket.orderItem.id },
    data: { returnStatus: "REJECTED", returnRejectionReason: parsed.data.reason },
  });
  await createTicketMessage({
    ticketId: ticket.id,
    authorId: admin.id,
    isFromStaff: true,
    body: `درخواست مرجوعی شما رد شد.\nدلیل: ${parsed.data.reason}`,
  });

  return NextResponse.json({ ok: true });
}
