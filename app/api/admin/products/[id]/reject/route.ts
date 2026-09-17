import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

const bodySchema = z.object({
  reason: z.string({ error: "دلیل رد الزامی است." }).min(1, "دلیل رد الزامی است."),
});

type Params = { params: Promise<{ id: string }> };

/// Final - the submitting seller cannot resubmit a rejected Product (docs/decisions.md ADR 39;
/// see request-revision/route.ts for the resubmittable alternative).
export async function POST(request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.status !== "PENDING_REVIEW") {
    return NextResponse.json({ error: "این محصول در انتظار بررسی نیست." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "دلیل رد الزامی است." },
      { status: 400 },
    );
  }

  await prisma.product.update({
    where: { id: product.id },
    data: { status: "REJECTED", rejectionReason: parsed.data.reason },
  });

  return NextResponse.json({ ok: true });
}
