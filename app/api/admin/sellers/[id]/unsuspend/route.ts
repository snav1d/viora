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
  const seller = await prisma.sellerProfile.findUnique({ where: { id } });
  if (!seller) {
    return NextResponse.json({ error: "فروشنده پیدا نشد." }, { status: 404 });
  }
  if (seller.status !== "SUSPENDED") {
    return NextResponse.json({ error: "این فروشنده تعلیق نیست." }, { status: 400 });
  }

  await prisma.sellerProfile.update({ where: { id }, data: { status: "APPROVED" } });

  return NextResponse.json({ ok: true });
}
