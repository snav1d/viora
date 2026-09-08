import "server-only";
import { prisma } from "@/lib/prisma";

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

export function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({ where: { slug } });
}

export function getProductsByCategoryId(categoryId: string) {
  return prisma.product.findMany({
    where: { categoryId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

export function getFeaturedProducts(take = 6) {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: { category: true, city: true, seller: true },
  });
}
