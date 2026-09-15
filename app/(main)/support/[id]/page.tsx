import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { TicketThread } from "@/components/support/TicketThread";
import { TicketReplyForm } from "@/components/support/TicketReplyForm";
import { getSession } from "@/lib/auth/session";
import { getTicketDetail } from "@/lib/data/support";
import { TICKET_STATUS_LABELS } from "@/lib/labels";

export const metadata: Metadata = {
  title: "تیکت پشتیبانی",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function TicketDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    redirect(`/auth?redirect=%2Fsupport%2F${id}`);
  }

  const ticket = await getTicketDetail(id);
  if (!ticket || ticket.userId !== session.userId) notFound();

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title={ticket.subject} backHref="/support" />

      <span className="w-fit rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
        {TICKET_STATUS_LABELS[ticket.status]}
      </span>

      <TicketThread messages={ticket.messages} customerAuthorId={ticket.userId} />

      <div className="mt-auto">
        <TicketReplyForm ticketId={ticket.id} />
      </div>
    </main>
  );
}
