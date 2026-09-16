import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { TicketThread } from "@/components/support/TicketThread";
import { TicketReplyForm } from "@/components/support/TicketReplyForm";
import { TicketStatusSelect } from "@/components/admin/TicketStatusSelect";
import { ApproveButton } from "@/components/admin/ApproveButton";
import { RejectForm } from "@/components/admin/RejectForm";
import { getTicketDetail, classifyTicketSender } from "@/lib/data/support";
import { TICKET_SENDER_LABELS, TICKET_TYPE_LABELS, RETURN_STATUS_LABELS } from "@/lib/labels";
import { toNumber } from "@/lib/decimal";

export const metadata: Metadata = {
  title: "بررسی تیکت",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminTicketDetailPage({ params }: Props) {
  const { id } = await params;
  const ticket = await getTicketDetail(id);
  if (!ticket) notFound();

  const senderLabel = TICKET_SENDER_LABELS[classifyTicketSender(ticket.user)];

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title="بررسی تیکت" backHref="/admin/tickets" />

      <section className="space-y-2 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-charcoal">{ticket.subject}</p>
          {ticket.type === "RETURN_REQUEST" ? (
            <span className="shrink-0 rounded-full bg-gold-100 px-2.5 py-0.5 text-[11px] font-medium text-gold-600">
              {TICKET_TYPE_LABELS.RETURN_REQUEST}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-charcoal-muted">
          {ticket.user.name ?? "کاربر ویورا"} · <span dir="ltr">{ticket.user.phone}</span> ·{" "}
          {senderLabel}
        </p>
        <TicketStatusSelect ticketId={ticket.id} status={ticket.status} />
      </section>

      {ticket.type === "RETURN_REQUEST" && ticket.orderItem ? (
        <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 text-sm">
          <div className="flex items-center justify-between">
            <p className="font-medium text-charcoal">
              {ticket.orderItem.product?.title ?? "محصول حذف‌شده"}
            </p>
            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-medium text-rose-700">
              {ticket.orderItem.returnStatus ? RETURN_STATUS_LABELS[ticket.orderItem.returnStatus] : "—"}
            </span>
          </div>
          <p className="text-charcoal-muted">
            فروشنده: {ticket.orderItem.seller?.businessName ?? "—"}
          </p>
          <p className="text-charcoal-muted">
            مبلغ آیتم:{" "}
            {(toNumber(ticket.orderItem.unitPrice) * ticket.orderItem.quantity).toLocaleString("fa-IR")}{" "}
            تومان
          </p>

          {ticket.orderItem.returnStatus === "REQUESTED" ? (
            <div className="flex flex-col gap-2 pt-1">
              <ApproveButton
                endpoint={`/api/admin/tickets/${ticket.id}/approve-return`}
                label="تایید مرجوعی"
              />
              <RejectForm endpoint={`/api/admin/tickets/${ticket.id}/reject-return`} />
            </div>
          ) : ticket.orderItem.returnStatus === "REJECTED" && ticket.orderItem.returnRejectionReason ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3 text-rose-700">
              <p className="font-medium">دلیل رد</p>
              <p className="mt-1">{ticket.orderItem.returnRejectionReason}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <TicketThread messages={ticket.messages} ownerLabel={senderLabel} />

      <div className="mt-auto">
        <TicketReplyForm endpoint={`/api/admin/tickets/${ticket.id}/messages`} />
      </div>
    </main>
  );
}
