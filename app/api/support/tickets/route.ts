import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

const bodySchema = z.object({
  subject: z.string({ error: "موضوع را وارد کنید." }).trim().min(1, "موضوع را وارد کنید."),
  message: z.string({ error: "پیام را وارد کنید." }).trim().min(1, "پیام را وارد کنید."),
});

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

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: session.userId,
      subject: parsed.data.subject,
      messages: {
        create: [{ authorId: session.userId, body: parsed.data.message }],
      },
    },
  });

  return NextResponse.json({ ok: true, ticketId: ticket.id });
}
