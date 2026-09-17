import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOperatingSeller } from "@/lib/auth/seller";
import { getSellerListingById } from "@/lib/data/seller";
import { storageUrlSchema } from "@/lib/validation/url";

const listingFields = {
  cityId: z.string().min(1),
  price: z.number().int().positive(),
  discountPrice: z.number().int().positive().nullable().optional(),
  stock: z.number().int().min(0),
};

const catalogFields = {
  title: z.string().min(2),
  description: z.string().min(1).optional(),
  categoryId: z.string().min(1),
  images: z.array(storageUrlSchema).max(6),
};

function checkDiscount(
  data: { price: number; discountPrice?: number | null },
  ctx: z.RefinementCtx,
) {
  if (data.discountPrice != null && data.discountPrice >= data.price) {
    ctx.addIssue({
      code: "custom",
      path: ["discountPrice"],
      message: "قیمت با تخفیف باید کمتر از قیمت اصلی باشد.",
    });
  }
}

// A Listing against an already-APPROVED Product: only this seller's own terms are editable, plus
// the active/inactive toggle they already had on the old combined ProductForm.
const listingOnlySchema = z.object({ ...listingFields, isActive: z.boolean() }).superRefine(checkDiscount);

// A Listing still PENDING_REVIEW/NEEDS_REVISION, belonging to the seller who originally submitted
// it: the full catalog form, same as creating a new product - no isActive field, since it can
// never be active before approval regardless of what's submitted here.
const unifiedSchema = z.object({ ...catalogFields, ...listingFields }).superRefine(checkDiscount);

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const seller = await requireOperatingSeller();
  if (!seller) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const existing = await getSellerListingById(seller.id, id);
  if (!existing) {
    return NextResponse.json({ error: "محصول پیدا نشد." }, { status: 404 });
  }
  if (existing.product.status === "REJECTED") {
    return NextResponse.json({ error: "این محصول رد شده و قابل ویرایش نیست." }, { status: 400 });
  }

  const canEditCatalog =
    existing.product.submittedBySellerId === seller.id &&
    (existing.product.status === "PENDING_REVIEW" || existing.product.status === "NEEDS_REVISION");

  const schema = canEditCatalog ? unifiedSchema : listingOnlySchema;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات وارد شده کامل یا معتبر نیست." }, { status: 400 });
  }

  const city = await prisma.city.findUnique({ where: { id: parsed.data.cityId } });
  if (!city || !city.isActive) {
    return NextResponse.json({ error: "شهر انتخاب‌شده معتبر نیست." }, { status: 400 });
  }

  if (canEditCatalog) {
    const data = parsed.data as z.infer<typeof unifiedSchema>;
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category || category.type !== "PRODUCT" || !category.isActive) {
      return NextResponse.json({ error: "دسته‌بندی انتخاب‌شده معتبر نیست." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.product.update({
        where: { id: existing.productId },
        data: {
          title: data.title,
          description: data.description,
          categoryId: category.id,
          images: data.images,
          // Editing while PENDING_REVIEW is a no-op status change; editing while NEEDS_REVISION
          // is exactly the resubmit this status exists for (docs/decisions.md ADR 39).
          status: "PENDING_REVIEW",
          rejectionReason: null,
        },
      }),
      prisma.listing.update({
        where: { id: existing.id },
        data: {
          cityId: city.id,
          price: data.price,
          discountPrice: data.discountPrice ?? null,
          stock: data.stock,
        },
      }),
    ]);
  } else {
    const data = parsed.data as z.infer<typeof listingOnlySchema>;
    await prisma.listing.update({
      where: { id: existing.id },
      data: {
        cityId: city.id,
        price: data.price,
        discountPrice: data.discountPrice ?? null,
        stock: data.stock,
        isActive: data.isActive,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const seller = await requireOperatingSeller();
  if (!seller) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const existing = await getSellerListingById(seller.id, id);
  if (!existing) {
    return NextResponse.json({ error: "محصول پیدا نشد." }, { status: 404 });
  }

  const isOwnUnapprovedSubmission =
    existing.product.submittedBySellerId === seller.id && existing.product.status !== "APPROVED";

  if (isOwnUnapprovedSubmission) {
    // Claiming a Listing requires the Product to already be APPROVED, so nobody else could
    // possibly hold a Listing against one that never was - safe to remove the whole submission,
    // not just this Listing.
    await prisma.$transaction([
      prisma.listing.delete({ where: { id: existing.id } }),
      prisma.product.delete({ where: { id: existing.productId } }),
    ]);
  } else {
    // An approved catalog Product may have other sellers' own Listings against it - only this
    // seller's own offering goes away. OrderItem keeps productId/sellerId directly (ADR 39), so
    // deleting a Listing never touches past order history.
    await prisma.listing.delete({ where: { id: existing.id } });
  }

  return NextResponse.json({ ok: true });
}
