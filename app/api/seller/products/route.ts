import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedSeller } from "@/lib/auth/seller";
import { productSlug } from "@/lib/slug";

const bodySchema = z.object({
  title: z.string().min(2),
  description: z.string().min(1).optional(),
  categoryId: z.string().min(1),
  cityId: z.string().min(1),
  price: z.number().int().positive(),
  stock: z.number().int().min(0),
  images: z.array(z.string().url()).max(6),
  isActive: z.boolean(),
});

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

  const product = await prisma.product.create({
    data: {
      sellerId: seller.id,
      categoryId: category.id,
      cityId: city.id,
      title: parsed.data.title,
      slug: productSlug(parsed.data.title),
      description: parsed.data.description,
      price: parsed.data.price,
      stock: parsed.data.stock,
      images: parsed.data.images,
      isActive: parsed.data.isActive,
    },
  });

  return NextResponse.json({ ok: true, productId: product.id });
}
