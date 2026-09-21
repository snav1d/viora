import "server-only";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import { applyPlatformMarkup } from "@/lib/pricing";
import { PRINT_CATEGORY_SLUG } from "@/lib/serviceCategories";
import type { ServiceProviderProfile, Category, ProviderPortfolioImage, ServiceOffering } from "@/lib/generated/prisma/client";

export type ServiceProviderCard = {
  providerId: string;
  businessName: string;
  isVerifiedByViora: boolean;
  portfolioImages: string[];
};

/** Every approved provider in one "simple" service category with at least one active offering in
 * this city (docs/decisions.md ADR 44) - ranked verified-first. There's no single "price" to sort
 * by anymore since a provider can carry several independently priced ServiceOfferings, unlike
 * ADR 43's one-fixed-package-per-provider model. */
export async function getActiveProvidersInCategory(
  categorySlug: string,
  cityId: string,
): Promise<ServiceProviderCard[]> {
  const providers = await prisma.serviceProviderProfile.findMany({
    where: {
      status: "APPROVED",
      category: { slug: categorySlug },
      serviceOfferings: { some: { isActive: true, cityId } },
    },
    include: { portfolioImages: true },
  });

  return providers
    .map((provider) => ({
      providerId: provider.id,
      businessName: provider.businessName,
      isVerifiedByViora: provider.isVerifiedByViora,
      portfolioImages: provider.portfolioImages.map((image) => image.imageUrl),
    }))
    .sort((a, b) => (a.isVerifiedByViora === b.isVerifiedByViora ? 0 : a.isVerifiedByViora ? -1 : 1));
}

export type ServiceProviderProfileForCustomer = {
  providerId: string;
  businessName: string;
  isVerifiedByViora: boolean;
  portfolioImages: string[];
  offerings: { id: string; title: string; description: string | null; price: number }[];
};

/** Full public profile for one provider in a category - their whole portfolio, every active
 * ServiceOffering (independently titled/described/priced, docs/decisions.md ADR 44), and reviews
 * are fetched separately via getProviderReviewSummary. Scoped to categorySlug too so a stale/
 * guessed URL can never show a provider under the wrong category page. */
export async function getProviderProfileForCustomer(
  providerId: string,
  categorySlug: string,
): Promise<ServiceProviderProfileForCustomer | null> {
  const provider = await prisma.serviceProviderProfile.findFirst({
    where: { id: providerId, status: "APPROVED", category: { slug: categorySlug } },
    include: {
      portfolioImages: true,
      serviceOfferings: { where: { isActive: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!provider) return null;

  return {
    providerId: provider.id,
    businessName: provider.businessName,
    isVerifiedByViora: provider.isVerifiedByViora,
    portfolioImages: provider.portfolioImages.map((image) => image.imageUrl),
    offerings: provider.serviceOfferings.map((offering) => ({
      id: offering.id,
      title: offering.title,
      description: offering.description,
      // Marked up here, at the source (docs/decisions.md ADR 45) - never the partner's raw
      // basePrice.
      price: applyPlatformMarkup(toNumber(offering.basePrice)),
    })),
  };
}

export type BookableOffering = { id: string; title: string; price: number; businessName: string };

/** One specific active offering, re-verified as belonging to this category/provider chain -
 * feeds the booking page's summary; the actual booking route (/api/service-bookings)
 * re-verifies everything again server-side regardless, same "never trust an earlier fetch"
 * convention as /api/print-orders. */
export async function getBookableOffering(
  offeringId: string,
  providerId: string,
  categorySlug: string,
): Promise<BookableOffering | null> {
  const offering = await prisma.serviceOffering.findFirst({
    where: {
      id: offeringId,
      providerId,
      isActive: true,
      category: { slug: categorySlug },
      provider: { status: "APPROVED" },
    },
    include: { provider: true },
  });
  if (!offering) return null;

  return {
    id: offering.id,
    title: offering.title,
    // Marked up here, at the source (docs/decisions.md ADR 45) - never the partner's raw
    // basePrice.
    price: applyPlatformMarkup(toNumber(offering.basePrice)),
    businessName: offering.provider.businessName,
  };
}

export type FeaturedProviderCard = {
  providerId: string;
  businessName: string;
  categorySlug: string;
  categoryLabel: string;
  portfolioImages: string[];
  /// Print's own pre-selected-partner order flow for a print provider (docs/decisions.md ADR
  /// 44's /print/partners pattern), or this provider's own /services/[category]/[id] profile
  /// for everyone else - computed here so /services' page never needs to branch on category.
  href: string;
};

type ProviderWithRelationsForCard = ServiceProviderProfile & {
  category: Category;
  portfolioImages: ProviderPortfolioImage[];
  serviceOfferings: ServiceOffering[];
};

function toFeaturedProviderCard(provider: ProviderWithRelationsForCard): FeaturedProviderCard {
  const href =
    provider.category.slug === PRINT_CATEGORY_SLUG
      ? provider.serviceOfferings[0]
        ? `/print?offering=${provider.serviceOfferings[0].id}`
        : "/print"
      : `/services/${provider.category.slug}/${provider.id}`;
  return {
    providerId: provider.id,
    businessName: provider.businessName,
    categorySlug: provider.category.slug,
    categoryLabel: provider.category.name,
    portfolioImages: provider.portfolioImages.map((image) => image.imageUrl),
    href,
  };
}

const FEATURED_PROVIDER_LIMIT = 10;

/** "پیشنهاد ویژه‌ی ویورا" row on the new /services page (docs/decisions.md ADR 45) -
 * isVerifiedByViora partners across every active SERVICE category at once (print included),
 * unlike getActiveProvidersInCategory which is scoped to one category's own browse page. */
export async function getVioraRecommendedProviders(cityId: string): Promise<FeaturedProviderCard[]> {
  const providers = await prisma.serviceProviderProfile.findMany({
    where: {
      status: "APPROVED",
      isVerifiedByViora: true,
      category: { type: "SERVICE", isActive: true },
      serviceOfferings: { some: { isActive: true, cityId } },
    },
    include: {
      category: true,
      portfolioImages: true,
      serviceOfferings: { where: { isActive: true, cityId }, take: 1 },
    },
    orderBy: { businessName: "asc" },
    take: FEATURED_PROVIDER_LIMIT,
  });
  return providers.map(toFeaturedProviderCard);
}

/** "تازه‌های ویورا" row - the most recently approved partners across every active SERVICE
 * category, ranked by approvedAt (docs/decisions.md ADR 45 - unlike updatedAt, this never
 * changes again after a later edit like a commissionRate override, so it stays a reliable
 * "newest approved" signal). */
export async function getVioraNewestProviders(cityId: string): Promise<FeaturedProviderCard[]> {
  const providers = await prisma.serviceProviderProfile.findMany({
    where: {
      status: "APPROVED",
      approvedAt: { not: null },
      category: { type: "SERVICE", isActive: true },
      serviceOfferings: { some: { isActive: true, cityId } },
    },
    include: {
      category: true,
      portfolioImages: true,
      serviceOfferings: { where: { isActive: true, cityId }, take: 1 },
    },
    orderBy: { approvedAt: "desc" },
    take: FEATURED_PROVIDER_LIMIT,
  });
  return providers.map(toFeaturedProviderCard);
}
