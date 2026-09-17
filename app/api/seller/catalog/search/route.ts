import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedSeller } from "@/lib/auth/seller";

/// Step 1 of the seller "add product" flow (docs/decisions.md ADR 39): search the shared catalog
/// before offering to create a new one, to avoid duplicate catalog entries for the same physical
/// product. Excludes products this seller already lists - clicking a result they already sell
/// wouldn't make sense.
export async function GET(request: Request) {
  const seller = await requireApprovedSeller();
  if (!seller) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ products: [] });
  }

  const products = await prisma.product.findMany({
    where: {
      status: "APPROVED",
      title: { contains: q },
      listings: { none: { sellerId: seller.id } },
    },
    include: { category: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    products: products.map((product) => ({
      id: product.id,
      title: product.title,
      code: product.code,
      categoryName: product.category.name,
    })),
  });
}
