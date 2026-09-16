import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOperatingSeller } from "@/lib/auth/seller";
import { getSellerProductById } from "@/lib/data/seller";
import { storageUrlSchema } from "@/lib/validation/url";

const bodySchema = z
  .object({
    title: z.string().min(2),
    description: z.string().min(1).optional(),
    categoryId: z.string().min(1),
    cityId: z.string().min(1),
    price: z.number().int().positive(),
    discountPrice: z.number().int().positive().nullable().optional(),
    stock: z.number().int().min(0),
    images: z.array(storageUrlSchema).max(6),
    isActive: z.boolean(),
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

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const seller = await requireOperatingSeller();
  if (!seller) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const existing = await getSellerProductById(seller.id, id);
  if (!existing) {
    return NextResponse.json({ error: "محصول پیدا نشد." }, { status: 404 });
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

  // slug is intentionally left untouched on edit - it's the product's public URL
  // (/shop/product/[slug]) and changing it on every title edit would break links already shared.
  await prisma.product.update({
    where: { id: existing.id },
    data: {
      categoryId: category.id,
      cityId: city.id,
      title: parsed.data.title,
      description: parsed.data.description,
      price: parsed.data.price,
      discountPrice: parsed.data.discountPrice ?? null,
      stock: parsed.data.stock,
      images: parsed.data.images,
      isActive: parsed.data.isActive,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const seller = await requireOperatingSeller();
  if (!seller) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const existing = await getSellerProductById(seller.id, id);
  if (!existing) {
    return NextResponse.json({ error: "محصول پیدا نشد." }, { status: 404 });
  }

  // Safe against past orders: OrderItem.productId is ON DELETE SET NULL (docs/decisions.md
  // ADR 23/27) - deleting a product never breaks an OrderItem row referencing it, it just loses
  // that reference, and no UI currently reads OrderItem.product for a completed order.
  await prisma.product.delete({ where: { id: existing.id } });

  return NextResponse.json({ ok: true });
}
