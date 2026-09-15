import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

const bodySchema = z.object({
  orderItemId: z.string({ error: "سفارش نامعتبر است." }).min(1, "سفارش نامعتبر است."),
  rating: z.number({ error: "امتیاز را انتخاب کنید." }).int().min(1).max(5),
  comment: z.string().trim().min(1).optional(),
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

  const item = await prisma.orderItem.findUnique({
    where: { id: parsed.data.orderItemId },
    include: { order: true, review: true },
  });
  if (!item || item.order.userId !== session.userId) {
    return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
  }
  if (!item.deliveredAt) {
    return NextResponse.json({ error: "این سفارش هنوز تحویل داده نشده است." }, { status: 400 });
  }
  if (item.review) {
    return NextResponse.json({ error: "شما قبلاً برای این مورد نظر ثبت کرده‌اید." }, { status: 400 });
  }

  try {
    const review = await prisma.review.create({
      data: {
        userId: session.userId,
        orderItemId: item.id,
        productId: item.productId,
        serviceOfferingId: item.serviceOfferingId,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      },
    });
    return NextResponse.json({ ok: true, review });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "شما قبلاً برای این مورد نظر ثبت کرده‌اید." }, { status: 400 });
    }
    throw error;
  }
}
