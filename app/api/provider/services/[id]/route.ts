import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedProvider } from "@/lib/auth/provider";
import { getMyServiceOfferingDetail } from "@/lib/data/provider";
import { PRINT_CATEGORY_SLUG } from "@/lib/serviceCategories";

const bodySchema = z.object({
  title: z.string({ error: "عنوان خدمت را وارد کنید." }).min(2, "عنوان خدمت را وارد کنید."),
  description: z.string().min(1).optional(),
  price: z.number({ error: "قیمت را وارد کنید." }).int().positive(),
  isActive: z.boolean(),
});

type Params = { params: Promise<{ id: string }> };

/// Edits (or deactivates via isActive) one of this provider's own ServiceOfferings (docs/
/// decisions.md ADR 44) - no admin review, same reasoning as creating one.
export async function PATCH(request: Request, { params }: Params) {
  const provider = await requireApprovedProvider();
  if (!provider) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }
  if (provider.category.slug === PRINT_CATEGORY_SLUG) {
    return NextResponse.json({ error: "این مسیر برای پارتنر چاپ نیست." }, { status: 400 });
  }

  const { id } = await params;
  const existing = await getMyServiceOfferingDetail(provider.id, id);
  if (!existing) {
    return NextResponse.json({ error: "خدمت پیدا نشد." }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "اطلاعات وارد شده کامل یا معتبر نیست." },
      { status: 400 },
    );
  }

  await prisma.serviceOffering.update({
    where: { id: existing.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      basePrice: parsed.data.price,
      isActive: parsed.data.isActive,
    },
  });

  return NextResponse.json({ ok: true });
}
