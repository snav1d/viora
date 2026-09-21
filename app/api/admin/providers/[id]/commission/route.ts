import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

const bodySchema = z.object({ commissionRate: z.number().min(0).max(100) });

type Params = { params: Promise<{ id: string }> };

/// Lets an admin override one specific provider's commissionRate anytime after approval (docs/
/// decisions.md ADR 45) - the category's own defaultCommissionRate only ever seeds this value at
/// the moment of first approval (see /api/admin/providers/[id]/approve), it never overwrites an
/// already-approved provider's rate on its own.
export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const provider = await prisma.serviceProviderProfile.findUnique({ where: { id } });
  if (!provider) {
    return NextResponse.json({ error: "پارتنر پیدا نشد." }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "درصد کمیسیون نامعتبر است." }, { status: 400 });
  }

  await prisma.serviceProviderProfile.update({
    where: { id },
    data: { commissionRate: parsed.data.commissionRate },
  });

  return NextResponse.json({ ok: true });
}
