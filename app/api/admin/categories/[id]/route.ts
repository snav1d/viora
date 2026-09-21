import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

// defaultCommissionRate is optional/nullable in both directions - only meaningful for a SERVICE
// category, and a category not yet given one just keeps ServiceProviderProfile.commissionRate's
// own flat @default(10.00) at approval time (docs/decisions.md ADR 45).
const bodySchema = z.object({
  isActive: z.boolean().optional(),
  defaultCommissionRate: z.union([z.number().min(0).max(100), z.null()]).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    return NextResponse.json({ error: "دسته‌بندی پیدا نشد." }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }

  await prisma.category.update({
    where: { id },
    data: {
      isActive: parsed.data.isActive,
      defaultCommissionRate: parsed.data.defaultCommissionRate,
    },
  });

  return NextResponse.json({ ok: true });
}
