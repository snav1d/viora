import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

const bodySchema = z.object({
  images: z.array(z.string()).max(6),
});

type Params = { params: Promise<{ id: string }> };

/// Lets an admin add/replace/remove a catalog Product's own images at any time, not just during
/// the initial PENDING_REVIEW pass - deliberately not gated on product.status. Before this route,
/// there was no way to add a photo to an already-APPROVED Product at all: the ~500 seeded catalog
/// rows shipped with images: [] (seed.ts never set any), and claiming an existing Product's
/// Listing terms (ClaimListingForm) only ever touches that seller's own price/stock, never the
/// shared catalog fields a Product's images belong to.
export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "محصول پیدا نشد." }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "درخواست نامعتبر است." },
      { status: 400 },
    );
  }

  await prisma.product.update({ where: { id }, data: { images: parsed.data.images } });

  return NextResponse.json({ ok: true });
}
