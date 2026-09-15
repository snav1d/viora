import "server-only";
import { prisma } from "@/lib/prisma";
import type { ApprovalStatus } from "@/lib/generated/prisma/client";

export function getSellerProfiles(status?: ApprovalStatus) {
  return prisma.sellerProfile.findMany({
    where: status ? { status } : undefined,
    include: { city: true, categories: { include: { category: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export function getSellerProfileDetail(id: string) {
  return prisma.sellerProfile.findUnique({
    where: { id },
    include: { city: true, categories: { include: { category: true } }, user: true },
  });
}

export async function getAdminStats() {
  const [pendingSellers, activeCities, activeCategories] = await Promise.all([
    prisma.sellerProfile.count({ where: { status: "PENDING" } }),
    prisma.city.count({ where: { isActive: true } }),
    prisma.category.count({ where: { isActive: true } }),
  ]);
  return { pendingSellers, activeCities, activeCategories };
}

export function getAllCities() {
  return prisma.city.findMany({ orderBy: { name: "asc" } });
}

export function getAllCategories() {
  return prisma.category.findMany({ orderBy: [{ type: "asc" }, { sortOrder: "asc" }] });
}
