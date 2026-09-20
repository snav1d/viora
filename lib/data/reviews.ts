import "server-only";
import { prisma } from "@/lib/prisma";

export type ReviewSummary = {
  average: number | null;
  count: number;
  reviews: { id: string; rating: number; comment: string | null; createdAt: Date; userName: string }[];
};

function summarize(
  rows: { id: string; rating: number; comment: string | null; createdAt: Date; user: { name: string | null } }[],
): ReviewSummary {
  const count = rows.length;
  const average = count === 0 ? null : rows.reduce((sum, r) => sum + r.rating, 0) / count;
  return {
    average,
    count,
    reviews: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      userName: r.user.name ?? "کاربر ویورا",
    })),
  };
}

export async function getProductReviewSummary(productId: string): Promise<ReviewSummary> {
  const rows = await prisma.review.findMany({
    where: { productId, isApproved: true },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  return summarize(rows);
}

export async function getServiceOfferingReviewSummary(serviceOfferingId: string): Promise<ReviewSummary> {
  const rows = await prisma.review.findMany({
    where: { serviceOfferingId, isApproved: true },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  return summarize(rows);
}

/// Aggregated across every one of a provider's ServiceOfferings (docs/decisions.md ADR 44) -
/// unlike getServiceOfferingReviewSummary, which is scoped to one offering, this is what the
/// customer-facing partner-profile page shows, since a "simple" category provider can have any
/// number of offerings and a customer reviewing one of them is really reviewing that provider.
export async function getProviderReviewSummary(providerId: string): Promise<ReviewSummary> {
  const rows = await prisma.review.findMany({
    where: { isApproved: true, serviceOffering: { providerId } },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  return summarize(rows);
}

/// Admin moderation queue (docs/decisions.md ADR 40) - every review starts `isApproved: false`
/// and never appears in the two summaries above until approved here.
export function getPendingReviews() {
  return prisma.review.findMany({
    where: { isApproved: false },
    include: { user: true, product: true, serviceOffering: true },
    orderBy: { createdAt: "asc" },
  });
}
