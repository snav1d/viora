import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedSeller } from "@/lib/auth/seller";

const bodySchema = z
  .object({
    productId: z.string().min(1),
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

/// "Claim" an already-approved catalog Product: the seller only enters their own price/stock/
/// discount/city, and it's live immediately - no admin review, since the catalog entry itself was
/// already approved (docs/decisions.md ADR 39).
export async function POST(request: Request) {
  const seller = await requireApprovedSeller();
  if (!seller) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات وارد شده کامل یا معتبر نیست." }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product || product.status !== "APPROVED") {
    return NextResponse.json({ error: "این محصول در کاتالوگ موجود نیست." }, { status: 400 });
  }

  const city = await prisma.city.findUnique({ where: { id: parsed.data.cityId } });
  if (!city || !city.isActive) {
    return NextResponse.json({ error: "شهر انتخاب‌شده معتبر نیست." }, { status: 400 });
  }

  const existing = await prisma.listing.findUnique({
    where: { productId_sellerId: { productId: product.id, sellerId: seller.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "شما قبلاً این محصول را در فروشگاه خود دارید." }, { status: 400 });
  }

  const listing = await prisma.listing.create({
    data: {
      productId: product.id,
      sellerId: seller.id,
      cityId: city.id,
      price: parsed.data.price,
      discountPrice: parsed.data.discountPrice ?? null,
      stock: parsed.data.stock,
      isActive: true,
    },
  });

  return NextResponse.json({ ok: true, listingId: listing.id });
}
