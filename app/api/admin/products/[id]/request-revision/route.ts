import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

const bodySchema = z.object({
  reason: z.string({ error: "دلیل نیاز به بازبینی الزامی است." }).min(1, "دلیل نیاز به بازبینی الزامی است."),
});

type Params = { params: Promise<{ id: string }> };

/// Unlike reject, NEEDS_REVISION is resubmittable - the submitting seller edits the catalog/
/// listing fields (app/api/seller/listings/[id]/route.ts's PATCH) and that resubmission returns
/// this Product straight to PENDING_REVIEW (docs/decisions.md ADR 39).
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
      { error: parsed.error.issues[0]?.message ?? "دلیل نیاز به بازبینی الزامی است." },
      { status: 400 },
    );
  }

  await prisma.product.update({
    where: { id: product.id },
    data: { status: "NEEDS_REVISION", rejectionReason: parsed.data.reason },
  });

  return NextResponse.json({ ok: true });
}
