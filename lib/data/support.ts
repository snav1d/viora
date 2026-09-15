import "server-only";
import { prisma } from "@/lib/prisma";
import type { TicketStatus } from "@/lib/generated/prisma/client";
import type { TicketSenderType } from "@/lib/labels";

export function getUserTickets(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

/// A ticket has no stored "sender type" of its own - this reads it live off the owner's current
/// profiles, same reasoning as every other role check in this app (ADR 21: never cached, always
/// a fresh lookup). A user holding more than one role (e.g. also a seller) is classified as that
/// role, since that's the more specific, actionable-for-admin classification; a plain user with
/// neither profile is a customer.
export function classifyTicketSender(user: {
  sellerProfile: unknown;
  serviceProviderProfile: unknown;
}): TicketSenderType {
  if (user.sellerProfile) return "SELLER";
  if (user.serviceProviderProfile) return "SERVICE_PROVIDER";
  return "CUSTOMER";
}

export function getAllTickets(status?: TicketStatus, senderType?: TicketSenderType) {
  return prisma.supportTicket.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(senderType === "SELLER" ? { user: { sellerProfile: { isNot: null } } } : {}),
      ...(senderType === "SERVICE_PROVIDER"
        ? { user: { serviceProviderProfile: { isNot: null } } }
        : {}),
      ...(senderType === "CUSTOMER"
        ? { user: { sellerProfile: null, serviceProviderProfile: null } }
        : {}),
    },
    include: { user: { include: { sellerProfile: true, serviceProviderProfile: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export function getTicketDetail(id: string) {
  return prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { include: { sellerProfile: true, serviceProviderProfile: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

/// Shared by both reply routes (the ticket owner's own, and the admin's) so the "create the
/// message, then bump the ticket's updatedAt" transaction exists in exactly one place -
/// isFromStaff is the caller's responsibility, decided by which route this was called from, not
/// re-derived here.
export function createTicketMessage(params: {
  ticketId: string;
  authorId: string;
  body: string;
  isFromStaff: boolean;
}) {
  return prisma.$transaction([
    prisma.ticketMessage.create({
      data: {
        ticketId: params.ticketId,
        authorId: params.authorId,
        body: params.body,
        isFromStaff: params.isFromStaff,
      },
    }),
    prisma.supportTicket.update({ where: { id: params.ticketId }, data: { updatedAt: new Date() } }),
  ]);
}
