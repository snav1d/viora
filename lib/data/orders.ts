import "server-only";
import { prisma } from "@/lib/prisma";

export function getOrdersForUser(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: { product: true, serviceOffering: true },
      },
    },
  });
}

/// findFirst (not findUnique) on the composite {id, userId} - this is the customer's own order
/// detail page, so a mismatched userId (another user's order id) must come back as "not found",
/// not a 403 that would confirm the order id exists at all.
export function getOrderDetailForUser(orderId: string, userId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: {
        include: {
          product: true,
          serviceOffering: true,
          review: true,
          // The one return ticket that matters for display is the most recent - a customer whose
          // return was rejected and who opened a fresh general support conversation afterward
          // isn't relevant here, only the return-request thread itself.
          returnTickets: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true } },
        },
      },
    },
  });
}
