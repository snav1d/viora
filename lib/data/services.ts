import "server-only";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import { parseCustomFieldValues } from "@/lib/serviceCategories";

export type SimpleServiceListing = {
  offeringId: string;
  providerId: string;
  businessName: string;
  basePrice: number;
  isVerifiedByViora: boolean;
  customFieldValues: Record<string, number>;
  portfolioImages: string[];
};

/** Every active offering in one "simple" service category + city (docs/decisions.md ADR 43) -
 * ranked verified-first then cheapest, same ranking philosophy as getMatchingPrintProviders (ADR
 * 42), but with no finish/color/quantity matching since these packages have no per-order choices
 * ("Option A": the customer just views and buys a flat package). */
export async function getActiveSimpleServiceOfferings(
  categorySlug: string,
  cityId: string,
): Promise<SimpleServiceListing[]> {
  const offerings = await prisma.serviceOffering.findMany({
    where: {
      cityId,
      isActive: true,
      category: { slug: categorySlug },
      provider: { status: "APPROVED" },
    },
    include: { provider: { include: { portfolioImages: true } } },
  });

  const results = offerings.map((offering) => ({
    offeringId: offering.id,
    providerId: offering.providerId,
    businessName: offering.provider.businessName,
    basePrice: toNumber(offering.basePrice),
    isVerifiedByViora: offering.provider.isVerifiedByViora,
    customFieldValues: parseCustomFieldValues(offering.customFieldsSchema),
    portfolioImages: offering.provider.portfolioImages.map((image) => image.imageUrl),
  }));

  return results.sort((a, b) => {
    if (a.isVerifiedByViora !== b.isVerifiedByViora) return a.isVerifiedByViora ? -1 : 1;
    return a.basePrice - b.basePrice;
  });
}
