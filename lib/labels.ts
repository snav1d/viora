import type { OrderStatus, TicketStatus } from "@/lib/generated/prisma/client";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت",
  PROCESSING: "در حال پردازش",
  SHIPPED: "ارسال شده",
  DELIVERED: "تحویل داده شده",
  CANCELLED: "لغو شده",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "باز",
  IN_PROGRESS: "در حال بررسی",
  RESOLVED: "حل‌شده",
  CLOSED: "بسته‌شده",
};
