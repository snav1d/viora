import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getAllTickets, classifyTicketSender } from "@/lib/data/support";
import { TICKET_SENDER_LABELS } from "@/lib/labels";

// Read-only list for the desktop AdminShell's floating support-chat drawer (docs/design-system.md
// §7) - lets it show open tickets without a full page navigation. Reuses the same getAllTickets
// the /admin/tickets page already calls server-side; this is just a client-fetchable view of it.
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const tickets = await getAllTickets("OPEN");

  return NextResponse.json({
    tickets: tickets.map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      senderLabel: TICKET_SENDER_LABELS[classifyTicketSender(ticket.user)],
      userName: ticket.user.name,
      userPhone: ticket.user.phone,
      updatedAt: ticket.updatedAt,
    })),
  });
}
