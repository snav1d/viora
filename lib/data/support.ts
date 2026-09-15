import "server-only";
import { prisma } from "@/lib/prisma";
import type { TicketStatus } from "@/lib/generated/prisma/client";

export function getUserTickets(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export function getAllTickets(status?: TicketStatus) {
  return prisma.supportTicket.findMany({
    where: status ? { status } : undefined,
    include: { user: true },
    orderBy: { updatedAt: "desc" },
  });
}

export function getTicketDetail(id: string) {
  return prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}
