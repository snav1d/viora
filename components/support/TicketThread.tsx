import { cn } from "@/lib/cn";

type Message = { id: string; isFromStaff: boolean; body: string; createdAt: Date };

// Shared by the ticket owner's own page and the admin ticket page - classified by the message's
// own isFromStaff flag (set at write time by which reply route handled it, not re-derived from
// comparing author ids - see docs/decisions.md ADR 34 on why that comparison alone was wrong for
// an owner who is also an admin), so the same rendering is correct from either side.
export function TicketThread({
  messages,
  ownerLabel,
}: {
  messages: Message[];
  ownerLabel: string;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {messages.map((message) => {
        const fromOwner = !message.isFromStaff;
        return (
          <li key={message.id} className={cn("flex flex-col gap-1", fromOwner ? "items-start" : "items-end")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                fromOwner ? "border border-border bg-surface text-charcoal" : "bg-gold-100 text-charcoal",
              )}
            >
              {message.body}
            </div>
            <p className="px-1 text-[11px] text-charcoal-muted">
              {fromOwner ? ownerLabel : "پشتیبانی ویورا"} ·{" "}
              {new Date(message.createdAt).toLocaleDateString("fa-IR")}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
