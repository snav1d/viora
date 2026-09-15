import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { TicketThread } from "@/components/support/TicketThread";
import { TicketReplyForm } from "@/components/support/TicketReplyForm";
import { TicketStatusSelect } from "@/components/admin/TicketStatusSelect";
import { getTicketDetail, classifyTicketSender } from "@/lib/data/support";
import { TICKET_SENDER_LABELS } from "@/lib/labels";

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
        <p className="font-medium text-charcoal">{ticket.subject}</p>
        <p className="text-sm text-charcoal-muted">
          {ticket.user.name ?? "کاربر ویورا"} · <span dir="ltr">{ticket.user.phone}</span> ·{" "}
          {senderLabel}
        </p>
        <TicketStatusSelect ticketId={ticket.id} status={ticket.status} />
      </section>

      <TicketThread messages={ticket.messages} ownerLabel={senderLabel} />

      <div className="mt-auto">
        <TicketReplyForm endpoint={`/api/admin/tickets/${ticket.id}/messages`} />
      </div>
    </main>
  );
}
