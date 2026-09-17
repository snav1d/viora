import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedSeller } from "@/lib/auth/seller";
import { randomSlug } from "@/lib/slug";
import { storageUrlSchema } from "@/lib/validation/url";

const bodySchema = z
  .object({
    title: z.string().min(2),
    description: z.string().min(1).optional(),
    categoryId: z.string().min(1),
    images: z.array(storageUrlSchema).max(6),
    cityId: z.string().min(1),
    price: z.number().int().positive(),
    discountPrice: z.number().int().positive().nullable().optional(),
    stock: z.number().int().min(0),
  })
  .superRefine((data, ctx) => {
    if (data.discountPrice != null && data.discountPrice >= data.price) {
      ctx.addIssue({
        code: "custom",
        path: ["discountPrice"],
        message: "قیمت با تخفیف باید کمتر از قیمت اصلی باشد.",
      });
    }
  });

/// A seller couldn't find their product in the existing catalog (see /api/seller/catalog/search)
/// and is submitting a brand-new one - one unified form for both the catalog fields (title/
/// description/category/images) and this seller's own listing terms (price/stock/discount/city),
/// per the confirmed design in docs/decisions.md ADR 39. Creates the Product as PENDING_REVIEW
/// and this seller's Listing as inactive together, so admin approval alone (no second step, no
/// need for the seller to come back) makes both live at once.
export async function POST(request: Request) {
  const seller = await requireApprovedSeller();
  if (!seller) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات محصول کامل یا معتبر نیست." }, { status: 400 });
  }

  const [category, city] = await Promise.all([
    prisma.category.findUnique({ where: { id: parsed.data.categoryId } }),
    prisma.city.findUnique({ where: { id: parsed.data.cityId } }),
  ]);
  if (!category || category.type !== "PRODUCT" || !category.isActive) {
    return NextResponse.json({ error: "دسته‌بندی انتخاب‌شده معتبر نیست." }, { status: 400 });
  }
  if (!city || !city.isActive) {
    return NextResponse.json({ error: "شهر انتخاب‌شده معتبر نیست." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        categoryId: category.id,
        title: parsed.data.title,
        slug: randomSlug(parsed.data.title),
        description: parsed.data.description,
        images: parsed.data.images,
        status: "PENDING_REVIEW",
        submittedBySellerId: seller.id,
      },
    });
    const listing = await tx.listing.create({
      data: {
        productId: product.id,
        sellerId: seller.id,
        cityId: city.id,
        price: parsed.data.price,
        discountPrice: parsed.data.discountPrice ?? null,
        stock: parsed.data.stock,
        // Inactive until admin approval flips it (and Product.status) live together - see
        // app/api/admin/products/[id]/approve/route.ts.
        isActive: false,
      },
    });
    return { product, listing };
  });

  return NextResponse.json({
    ok: true,
    productId: result.product.id,
    listingId: result.listing.id,
  });
}
