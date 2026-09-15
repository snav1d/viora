"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TICKET_STATUS_LABELS } from "@/lib/labels";
import type { TicketStatus } from "@/lib/generated/prisma/client";

const STATUSES = Object.keys(TICKET_STATUS_LABELS) as TicketStatus[];

export function TicketStatusSelect({ ticketId, status }: { ticketId: string; status: TicketStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setError(null);
    setPending(true);
    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: event.target.value }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <select
        value={status}
        onChange={handleChange}
        disabled={pending}
        className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-charcoal disabled:opacity-50"
      >
        {STATUSES.map((value) => (
          <option key={value} value={value}>
            {TICKET_STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      {error ? <p className="text-[10px] text-rose-700">{error}</p> : null}
    </div>
  );
}
