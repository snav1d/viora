"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Headset, X, ChevronRight } from "lucide-react";
import { TicketThread } from "@/components/support/TicketThread";
import { TicketReplyForm } from "@/components/support/TicketReplyForm";

type TicketSummary = {
  id: string;
  subject: string;
  senderLabel: string;
  userName: string | null;
  userPhone: string;
  updatedAt: string;
};

type TicketDetail = {
  id: string;
  subject: string;
  senderLabel: string;
  messages: {
    id: string;
    isFromStaff: boolean;
    body: string;
    imageUrl: string | null;
    createdAt: string;
  }[];
};

/// The `lg`+ floating support panel from docs/design-system.md §7 - an admin can keep a ticket
/// conversation open in this drawer while navigating/working anywhere else in the panel, instead
/// of a full page switch away from whatever queue they were reviewing. Open/selected-ticket state
/// lives in the URL's query string (`chat`, `ticket`), never in the database, so a refresh doesn't
/// lose it and the state is never confused with anything persisted server-side.
export function SupportChatDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isOpen = searchParams.get("chat") === "open";
  const ticketId = searchParams.get("ticket");

  const [tickets, setTickets] = useState<TicketSummary[] | null>(null);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(false);

  function setQuery(next: { chat?: "open" | null; ticket?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());
    if ("chat" in next) {
      if (next.chat) params.set("chat", next.chat);
      else params.delete("chat");
    }
    if ("ticket" in next) {
      if (next.ticket) params.set("ticket", next.ticket);
      else params.delete("ticket");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (!isOpen || ticketId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch("/api/admin/tickets")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setTickets(data.tickets ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, ticketId]);

  useEffect(() => {
    if (!isOpen || !ticketId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/admin/tickets/${ticketId}`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setTicket(data.ticket ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, ticketId]);

  // A reply just posted through TicketReplyForm calls router.refresh(), which re-runs this
  // effect's fetch (ticketId is unchanged, but the effect still needs to re-run) - simplest is to
  // just re-fetch on every isOpen/ticketId combination already covered above; refresh also
  // re-triggers this component's own render, which is enough since the effect deps are the same
  // values, not a changing counter. To be safe against the effect skipping an identical-deps
  // re-run, the reply form's onSuccess below re-fetches directly instead of relying on that alone.

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setQuery({ chat: "open" })}
        aria-label="باز کردن گفتگوی پشتیبانی"
        className="fixed bottom-6 left-6 z-50 hidden h-14 w-14 items-center justify-center rounded-full bg-charcoal text-warm-white shadow-lg shadow-charcoal/20 hover:bg-charcoal/90 lg:flex"
      >
        <Headset className="h-6 w-6" strokeWidth={1.75} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 hidden h-[36rem] w-96 flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl shadow-charcoal/20 lg:flex">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        {ticketId ? (
          <button
            type="button"
            onClick={() => setQuery({ ticket: null })}
            aria-label="بازگشت به لیست تیکت‌ها"
            className="flex h-8 w-8 items-center justify-center rounded-full text-charcoal-muted hover:bg-rose-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <Headset className="h-4 w-4 text-charcoal-muted" strokeWidth={1.75} />
        )}
        <p className="flex-1 truncate text-sm font-medium text-charcoal">
          {ticketId && ticket ? ticket.subject : "پشتیبانی"}
        </p>
        <button
          type="button"
          onClick={() => setQuery({ chat: null, ticket: null })}
          aria-label="بستن"
          className="flex h-8 w-8 items-center justify-center rounded-full text-charcoal-muted hover:bg-rose-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <p className="py-8 text-center text-sm text-charcoal-muted">در حال بارگذاری…</p>
        ) : ticketId ? (
          ticket ? (
            <TicketThread messages={ticket.messages} ownerLabel={ticket.senderLabel} />
          ) : (
            <p className="py-8 text-center text-sm text-charcoal-muted">تیکت پیدا نشد.</p>
          )
        ) : tickets && tickets.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {tickets.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setQuery({ ticket: item.id })}
                  className="flex w-full flex-col gap-0.5 rounded-2xl border border-border p-3 text-right text-sm transition-colors hover:border-charcoal/25"
                >
                  <p className="font-medium text-charcoal">{item.subject}</p>
                  <p className="text-xs text-charcoal-muted">
                    {item.userName ?? "کاربر ویورا"} · {item.senderLabel}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-charcoal-muted">تیکت باز فعلاً وجود ندارد.</p>
        )}
      </div>

      {ticketId ? (
        <div className="border-t border-border p-3">
          <TicketReplyForm
            endpoint={`/api/admin/tickets/${ticketId}/messages`}
            onSuccess={() => {
              fetch(`/api/admin/tickets/${ticketId}`)
                .then((response) => response.json())
                .then((data) => setTicket(data.ticket ?? null));
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
