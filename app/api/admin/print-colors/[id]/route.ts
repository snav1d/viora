import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const color = await prisma.printColor.findUnique({ where: { id } });
  if (!color) {
    return NextResponse.json({ error: "رنگ پیدا نشد." }, { status: 404 });
  }

  await prisma.printColor.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
