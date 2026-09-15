import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/admin";

const bodySchema = z.object({
  body: z.string({ error: "پیام را وارد کنید." }).trim().min(1, "پیام را وارد کنید."),
});

type Params = { params: Promise<{ id: string }> };

// Shared by both the customer's own ticket thread and the admin ticket thread - who's allowed
// to post is decided here (the ticket's own owner, or an admin), not by which page called it.
export async function POST(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ابتدا وارد شوید.", requiresAuth: true }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "تیکت پیدا نشد." }, { status: 404 });
  }

  const isOwner = ticket.userId === session.userId;
  if (!isOwner) {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
    }
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "درخواست نامعتبر است." },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: { ticketId: id, authorId: session.userId, body: parsed.data.body },
    }),
    // Bumps updatedAt so both the customer's and the admin's ticket lists sort by most recent
    // activity, not just ticket-creation time.
    prisma.supportTicket.update({ where: { id }, data: { updatedAt: new Date() } }),
  ]);

  return NextResponse.json({ ok: true });
}
