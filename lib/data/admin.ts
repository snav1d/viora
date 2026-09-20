import "server-only";
import { prisma } from "@/lib/prisma";
import type { ApprovalStatus, SellerStatus, ProductStatus } from "@/lib/generated/prisma/client";

export function getSellerProfiles(status?: SellerStatus) {
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

/// categorySlug narrows to providers whose (one) ServiceOffering belongs to that category -
/// docs/decisions.md ADR 43's admin queue filter, now that print/balloon-decor/photography all
/// share this same queue.
export function getServiceProviderProfiles(status?: ApprovalStatus, categorySlug?: string) {
  return prisma.serviceProviderProfile.findMany({
    where: {
      ...(status ? { status } : undefined),
      ...(categorySlug ? { serviceOfferings: { some: { category: { slug: categorySlug } } } } : undefined),
    },
    include: { serviceOfferings: { include: { pricingTiers: true, category: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export function getServiceProviderProfileDetail(id: string) {
  return prisma.serviceProviderProfile.findUnique({
    where: { id },
    include: { serviceOfferings: { include: { pricingTiers: true, category: true } } },
  });
}

export async function getAdminStats() {
  const now = new Date();
  const [
    pendingSellers,
    pendingProviders,
    openTickets,
    activeCities,
    activeCategories,
    activeCoupons,
    liveTheme,
    hubItems,
    pendingReturns,
    pendingProducts,
    pendingReviews,
  ] = await Promise.all([
    prisma.sellerProfile.count({ where: { status: "PENDING" } }),
    prisma.serviceProviderProfile.count({ where: { status: "PENDING" } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.city.count({ where: { isActive: true } }),
    prisma.category.count({ where: { isActive: true } }),
    prisma.coupon.count({ where: { isActive: true } }),
    prisma.seasonalTheme.findFirst({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    }),
    prisma.orderItem.count({ where: { hubStatus: { in: ["RECEIVED_AT_HUB", "QUALITY_CHECK"] } } }),
    prisma.orderItem.count({ where: { returnStatus: "REQUESTED" } }),
    prisma.product.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.review.count({ where: { isApproved: false } }),
  ]);
  return {
    pendingSellers,
    pendingProviders,
    openTickets,
    activeCities,
    activeCategories,
    activeCoupons,
    liveThemeName: liveTheme?.name ?? null,
    hubItems,
    pendingReturns,
    pendingProducts,
    pendingReviews,
  };
}

export function getProductsByStatus(status: ProductStatus) {
  return prisma.product.findMany({
    where: { status },
    include: { category: true, submittedBySeller: true },
    orderBy: { createdAt: "desc" },
  });
}

export function getProductReviewDetail(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      submittedBySeller: true,
      // Every Listing, not just active ones - admin needs to see the submitter's own terms even
      // while it's still inactive-pending-approval (docs/decisions.md ADR 39).
      listings: { include: { seller: true, city: true }, orderBy: { createdAt: "asc" } },
    },
  });
}

export function getAllSeasonalThemes() {
  return prisma.seasonalTheme.findMany({ orderBy: { startsAt: "desc" } });
}

export function getSeasonalThemeDetail(id: string) {
  return prisma.seasonalTheme.findUnique({ where: { id } });
}

export function getAllBanners() {
  return prisma.banner.findMany({ orderBy: { createdAt: "desc" } });
}

export function getBannerDetail(id: string) {
  return prisma.banner.findUnique({ where: { id } });
}

export function getAllCities() {
  return prisma.city.findMany({ orderBy: { name: "asc" } });
}

export function getAllCategories() {
  return prisma.category.findMany({ orderBy: [{ type: "asc" }, { sortOrder: "asc" }] });
}

export function getAllPrintColors() {
  return prisma.printColor.findMany({ orderBy: { name: "asc" } });
}

export function getAllCoupons() {
  return prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
}
