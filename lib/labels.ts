import type { OrderStatus, TicketStatus, CouponType } from "@/lib/generated/prisma/client";

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

/// Who a support ticket's own owner is, by account role - used to label their messages in the
/// thread (instead of a blanket "مشتری") and to filter/badge the admin ticket queue. Computed
/// from the account's current profiles (see lib/data/support.ts's classifyTicketSender), not
/// stored on the ticket, so it always reflects the account's role today.
export type TicketSenderType = "CUSTOMER" | "SELLER" | "SERVICE_PROVIDER";

export const TICKET_SENDER_LABELS: Record<TicketSenderType, string> = {
  CUSTOMER: "مشتری",
  SELLER: "فروشنده",
  SERVICE_PROVIDER: "پارتنر تولید",
};

export const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  PERCENTAGE: "درصدی",
  FIXED_AMOUNT: "مبلغ ثابت",
};
