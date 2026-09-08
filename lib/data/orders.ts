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
