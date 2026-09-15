import { cn } from "@/lib/cn";

type Message = { id: string; authorId: string; body: string; createdAt: Date };

// Shared by the customer's own ticket page and the admin ticket page - classified by whether
// each message's author is the ticket's own customer, not by who's currently viewing, so the
// same rendering is correct from either side without needing two variants.
export function TicketThread({
  messages,
  customerAuthorId,
}: {
  messages: Message[];
  customerAuthorId: string;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {messages.map((message) => {
        const fromCustomer = message.authorId === customerAuthorId;
        return (
          <li key={message.id} className={cn("flex flex-col gap-1", fromCustomer ? "items-start" : "items-end")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                fromCustomer ? "border border-border bg-surface text-charcoal" : "bg-gold-100 text-charcoal",
              )}
            >
              {message.body}
            </div>
            <p className="px-1 text-[11px] text-charcoal-muted">
              {fromCustomer ? "مشتری" : "پشتیبانی ویورا"} ·{" "}
              {new Date(message.createdAt).toLocaleDateString("fa-IR")}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
