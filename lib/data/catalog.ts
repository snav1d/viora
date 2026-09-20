import "server-only";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import type { Prisma } from "@/lib/generated/prisma/client";

export function getActiveCities() {
  return prisma.city.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export function getActiveProductCategories() {
  return prisma.category.findMany({
    where: { type: "PRODUCT", isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

/// Every active SERVICE category (print, بادکنک‌آرا, عکاسی, ...) - the home page's own
/// "دسته‌بندی‌ها" grid shows these alongside product categories (docs/decisions.md ADR 44 item 5),
/// so a future new service category needs no code change here, only a seeded row.
export function getActiveServiceCategories() {
  return prisma.category.findMany({
    where: { type: "SERVICE", isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({ where: { slug } });
}

/// Picks the cheapest currently-active Listing by effective price (discountPrice ?? price) - a
/// plain JS reduce, not a DB-level ORDER BY, since MySQL/Prisma can't cleanly order by
/// COALESCE across a nullable and a non-nullable Decimal column through the query builder, and in
/// practice a Product has only a handful of Listings. See docs/decisions.md ADR 39. Callers
/// already filter to `isActive: true` listings only, so an empty array here never happens for a
/// Product that made it through the `listings: { some: { isActive: true } }` where-clause.
function pickCheapestListing<T extends { price: Prisma.Decimal; discountPrice: Prisma.Decimal | null }>(
  listings: T[],
): T {
  return listings.reduce((cheapest, listing) => {
    const effective = toNumber(listing.discountPrice ?? listing.price);
    const cheapestEffective = toNumber(cheapest.discountPrice ?? cheapest.price);
    return effective < cheapestEffective ? listing : cheapest;
  });
}

export async function getProductsByCategoryId(categoryId: string) {
  const products = await prisma.product.findMany({
    where: { categoryId, status: "APPROVED", listings: { some: { isActive: true } } },
    include: { listings: { where: { isActive: true } } },
    orderBy: { createdAt: "desc" },
  });
  return products.map((product) => ({ ...product, listing: pickCheapestListing(product.listings) }));
}

export async function getFeaturedProducts(take = 6) {
  const products = await prisma.product.findMany({
    where: { status: "APPROVED", listings: { some: { isActive: true } } },
    include: { listings: { where: { isActive: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
  return products.map((product) => ({ ...product, listing: pickCheapestListing(product.listings) }));
}

/// Every product page needs the cheapest active Listing as its default selection, and - when more
/// than one seller carries the same Product - the rest sorted cheapest-first so a customer can
/// pick a different seller instead (docs/decisions.md ADR 41's "سایر فروشنده‌های این محصول").
export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      listings: { where: { isActive: true }, include: { city: true, seller: true } },
    },
  });
  if (!product || product.status !== "APPROVED" || product.listings.length === 0) return null;

  const sortedListings = [...product.listings].sort((a, b) => {
    const effectiveA = toNumber(a.discountPrice ?? a.price);
    const effectiveB = toNumber(b.discountPrice ?? b.price);
    return effectiveA - effectiveB;
  });
  const [listing, ...otherListings] = sortedListings;
  return { ...product, listing, otherListings };
}

export async function searchProducts(query: string) {
  const products = await prisma.product.findMany({
    where: { status: "APPROVED", title: { contains: query }, listings: { some: { isActive: true } } },
    include: { listings: { where: { isActive: true } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return products.map((product) => ({ ...product, listing: pickCheapestListing(product.listings) }));
}
