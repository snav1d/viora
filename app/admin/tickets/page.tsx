import type { Metadata } from "next";
import Link from "next/link";
import { Headset } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { getAllTickets, classifyTicketSender } from "@/lib/data/support";
import { TICKET_STATUS_LABELS, TICKET_SENDER_LABELS } from "@/lib/labels";
import { cn } from "@/lib/cn";
import type { TicketStatus } from "@/lib/generated/prisma/client";
import type { TicketSenderType } from "@/lib/labels";

export const metadata: Metadata = {
  title: "تیکت‌های پشتیبانی",
  robots: { index: false, follow: false },
};

// Ticket status/replies change from this very panel - must never be cached at build time.
export const dynamic = "force-dynamic";

const STATUS_TABS: TicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const SENDER_TABS: TicketSenderType[] = ["CUSTOMER", "SELLER", "SERVICE_PROVIDER"];

type Props = { searchParams: Promise<{ status?: string; type?: string }> };

export default async function AdminTicketsPage({ searchParams }: Props) {
  const { status, type } = await searchParams;
  const filterStatus: TicketStatus = STATUS_TABS.includes(status as TicketStatus)
    ? (status as TicketStatus)
    : "OPEN";
  const filterSender: TicketSenderType | undefined = SENDER_TABS.includes(type as TicketSenderType)
    ? (type as TicketSenderType)
    : undefined;
  const tickets = await getAllTickets(filterStatus, filterSender);

  function withParams(next: { status?: TicketStatus; type?: TicketSenderType }) {
    const params = new URLSearchParams();
    params.set("status", next.status ?? filterStatus);
    if (next.type ?? filterSender) params.set("type", (next.type ?? filterSender)!);
    return `/admin/tickets?${params.toString()}`;
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title="تیکت‌های پشتیبانی" />

      <div className="flex gap-2 overflow-x-auto">
        {STATUS_TABS.map((value) => (
          <Link
            key={value}
            href={withParams({ status: value })}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm transition-colors",
              filterStatus === value
                ? "border-gold-500 bg-gold-100 text-charcoal"
                : "border-border bg-surface text-charcoal-muted hover:border-rose-300",
            )}
          >
            {TICKET_STATUS_LABELS[value]}
          </Link>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <Link
          href={`/admin/tickets?status=${filterStatus}`}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
            !filterSender
              ? "border-rose-400 bg-rose-50 text-rose-700"
              : "border-border bg-surface text-charcoal-muted hover:border-rose-300",
          )}
        >
          همه
        </Link>
        {SENDER_TABS.map((value) => (
          <Link
            key={value}
            href={withParams({ type: value })}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
              filterSender === value
                ? "border-rose-400 bg-rose-50 text-rose-700"
                : "border-border bg-surface text-charcoal-muted hover:border-rose-300",
            )}
          >
            {TICKET_SENDER_LABELS[value]}
          </Link>
        ))}
      </div>

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
          <Headset className="h-6 w-6 text-charcoal-muted" strokeWidth={1.5} />
          <p className="text-sm text-charcoal-muted">تیکتی در این وضعیت نیست.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/admin/tickets/${ticket.id}`}
                className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4 text-sm hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-charcoal">{ticket.subject}</p>
                  <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-medium text-rose-700">
                    {TICKET_SENDER_LABELS[classifyTicketSender(ticket.user)]}
                  </span>
                </div>
                <p className="text-charcoal-muted">
                  {ticket.user.name ?? "کاربر ویورا"} ·{" "}
                  <span dir="ltr">{ticket.user.phone}</span>
                </p>
                <p className="text-xs text-charcoal-muted">
                  {new Date(ticket.updatedAt).toLocaleDateString("fa-IR")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
