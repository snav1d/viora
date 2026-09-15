import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { createTicketMessage } from "@/lib/data/support";

const bodySchema = z.object({
  body: z.string({ error: "پیام را وارد کنید." }).trim().min(1, "پیام را وارد کنید."),
});

type Params = { params: Promise<{ id: string }> };

// The admin-side reply endpoint - the only place a message ever gets marked isFromStaff: true
// (docs/decisions.md ADR 34). No ownership check: any admin can reply to any ticket.
export async function POST(request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "تیکت پیدا نشد." }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "درخواست نامعتبر است." },
      { status: 400 },
    );
  }

  await createTicketMessage({
    ticketId: id,
    authorId: admin.id,
    body: parsed.data.body,
    isFromStaff: true,
  });

  return NextResponse.json({ ok: true });
}
