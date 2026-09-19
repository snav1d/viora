import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review || review.isApproved) {
    return NextResponse.json({ error: "این نظر در انتظار تایید نیست." }, { status: 400 });
  }

  await prisma.review.update({ where: { id: review.id }, data: { isApproved: true } });

  return NextResponse.json({ ok: true });
}
