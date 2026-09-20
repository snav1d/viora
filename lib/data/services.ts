import "server-only";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";

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
      price: toNumber(offering.basePrice),
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
    price: toNumber(offering.basePrice),
    businessName: offering.provider.businessName,
  };
}
