import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

const bodySchema = z.object({ isActive: z.boolean() });

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const city = await prisma.city.findUnique({ where: { id } });
  if (!city) {
    return NextResponse.json({ error: "شهر پیدا نشد." }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }

  await prisma.city.update({ where: { id }, data: { isActive: parsed.data.isActive } });

  return NextResponse.json({ ok: true });
}
