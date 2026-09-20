import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedProvider } from "@/lib/auth/provider";
import { randomSlug } from "@/lib/slug";
import { PRINT_CATEGORY_SLUG } from "@/lib/serviceCategories";

const bodySchema = z.object({
  title: z.string({ error: "عنوان خدمت را وارد کنید." }).min(2, "عنوان خدمت را وارد کنید."),
  description: z.string().min(1).optional(),
  price: z.number({ error: "قیمت را وارد کنید." }).int().positive(),
});

/// Creates one of a "simple" category provider's own named ServiceOfferings (docs/decisions.md
/// ADR 44) - auto-active immediately, no admin review, since the provider itself was already
/// approved. Print providers never reach this route (they keep their single dedicated offering,
/// edited from /provider/offering instead) - guarded here, not just hidden in the UI.
export async function POST(request: Request) {
  const provider = await requireApprovedProvider();
  if (!provider) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  if (provider.category.slug === PRINT_CATEGORY_SLUG) {
    return NextResponse.json({ error: "این مسیر برای پارتنر چاپ نیست." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "اطلاعات وارد شده کامل یا معتبر نیست." },
      { status: 400 },
    );
  }

  const city = await prisma.city.findFirst({ where: { isActive: true } });
  if (!city) {
    return NextResponse.json({ error: "در حال حاضر هیچ شهری فعال نیست." }, { status: 400 });
  }

  const offering = await prisma.serviceOffering.create({
    data: {
      providerId: provider.id,
      categoryId: provider.categoryId,
      cityId: city.id,
      title: parsed.data.title,
      slug: randomSlug(parsed.data.title),
      description: parsed.data.description,
      basePrice: parsed.data.price,
      isActive: true,
    },
  });

  return NextResponse.json({ ok: true, offeringId: offering.id });
}
