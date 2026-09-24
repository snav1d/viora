import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getTicketDetail, classifyTicketSender } from "@/lib/data/support";
import { TICKET_SENDER_LABELS } from "@/lib/labels";

type Params = { params: Promise<{ id: string }> };

// Read-only detail for the desktop AdminShell's floating support-chat drawer (docs/design-system.md
// §7) - same data as /admin/tickets/[id], just client-fetchable so the drawer can show a thread
// without leaving whatever admin page is open.
export async function GET(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const ticket = await getTicketDetail(id);
  if (!ticket) {
    return NextResponse.json({ error: "تیکت پیدا نشد." }, { status: 404 });
  }

  return NextResponse.json({
    ticket: {
      id: ticket.id,
      subject: ticket.subject,
      senderLabel: TICKET_SENDER_LABELS[classifyTicketSender(ticket.user)],
      messages: ticket.messages.map((message) => ({
        id: message.id,
        isFromStaff: message.isFromStaff,
        body: message.body,
        imageUrl: message.imageUrl,
        createdAt: message.createdAt,
      })),
    },
  });
}
