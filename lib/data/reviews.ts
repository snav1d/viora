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
    where: { productId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  return summarize(rows);
}

export async function getServiceOfferingReviewSummary(serviceOfferingId: string): Promise<ReviewSummary> {
  const rows = await prisma.review.findMany({
    where: { serviceOfferingId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  return summarize(rows);
}
