import type { Metadata } from "next";
import Link from "next/link";
import { Headset } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { getAllTickets, classifyTicketSender } from "@/lib/data/support";
import { TICKET_STATUS_LABELS, TICKET_SENDER_LABELS, TICKET_TYPE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/cn";
import type { TicketStatus, TicketType } from "@/lib/generated/prisma/client";
import type { TicketSenderType } from "@/lib/labels";

export const metadata: Metadata = {
  title: "تیکت‌های پشتیبانی",
  robots: { index: false, follow: false },
};

// Ticket status/replies change from this very panel - must never be cached at build time.
export const dynamic = "force-dynamic";

const STATUS_TABS: TicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const SENDER_TABS: TicketSenderType[] = ["CUSTOMER", "SELLER", "SERVICE_PROVIDER"];

type Props = { searchParams: Promise<{ status?: string; sender?: string; type?: string }> };

export default async function AdminTicketsPage({ searchParams }: Props) {
  const { status, sender, type } = await searchParams;
  const filterStatus: TicketStatus = STATUS_TABS.includes(status as TicketStatus)
    ? (status as TicketStatus)
    : "OPEN";
  const filterSender: TicketSenderType | undefined = SENDER_TABS.includes(sender as TicketSenderType)
    ? (sender as TicketSenderType)
    : undefined;
  const filterType: TicketType | undefined = type === "RETURN_REQUEST" ? "RETURN_REQUEST" : undefined;
  const tickets = await getAllTickets(filterStatus, filterSender, filterType);

  function withParams(next: { status?: TicketStatus; sender?: TicketSenderType; type?: TicketType }) {
    const params = new URLSearchParams();
    params.set("status", next.status ?? filterStatus);
    const nextSender = "sender" in next ? next.sender : filterSender;
    if (nextSender) params.set("sender", nextSender);
    const nextType = "type" in next ? next.type : filterType;
    if (nextType) params.set("type", nextType);
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
                ? "border-charcoal bg-charcoal/5 text-charcoal"
                : "border-border bg-surface text-charcoal-muted hover:border-charcoal/25",
            )}
          >
            {TICKET_STATUS_LABELS[value]}
          </Link>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <Link
          href={withParams({ sender: undefined })}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
            !filterSender
              ? "border-charcoal bg-charcoal/5 text-charcoal"
              : "border-border bg-surface text-charcoal-muted hover:border-charcoal/25",
          )}
        >
          همه فرستنده‌ها
        </Link>
        {SENDER_TABS.map((value) => (
          <Link
            key={value}
            href={withParams({ sender: value })}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
              filterSender === value
                ? "border-charcoal bg-charcoal/5 text-charcoal"
                : "border-border bg-surface text-charcoal-muted hover:border-charcoal/25",
            )}
          >
            {TICKET_SENDER_LABELS[value]}
          </Link>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <Link
          href={withParams({ type: undefined })}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
            !filterType
              ? "border-charcoal bg-charcoal/5 text-charcoal"
              : "border-border bg-surface text-charcoal-muted hover:border-charcoal/25",
          )}
        >
          همه نوع‌ها
        </Link>
        <Link
          href={withParams({ type: "RETURN_REQUEST" })}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
            filterType === "RETURN_REQUEST"
              ? "border-charcoal bg-charcoal/5 text-charcoal"
              : "border-border bg-surface text-charcoal-muted hover:border-charcoal/25",
          )}
        >
          {TICKET_TYPE_LABELS.RETURN_REQUEST}
        </Link>
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
                className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4 text-sm transition-colors hover:border-charcoal/25"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-charcoal">{ticket.subject}</p>
                  <div className="flex shrink-0 gap-1">
                    {ticket.type === "RETURN_REQUEST" ? (
                      <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-[11px] font-medium text-gold-600">
                        {TICKET_TYPE_LABELS.RETURN_REQUEST}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-medium text-rose-700">
                      {TICKET_SENDER_LABELS[classifyTicketSender(ticket.user)]}
                    </span>
                  </div>
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
