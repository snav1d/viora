import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Headset, Plus } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { getSession } from "@/lib/auth/session";
import { getUserTickets } from "@/lib/data/support";
import { TICKET_STATUS_LABELS } from "@/lib/labels";

export const metadata: Metadata = {
  title: "پشتیبانی",
  robots: { index: false, follow: false },
};

// New tickets and admin replies both change this list - must never be frozen at build time.
export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth?redirect=%2Fsupport");
  }

  const tickets = await getUserTickets(session.userId);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title="پشتیبانی" backHref="/profile" />

      <Link
        href="/support/new"
        className="flex items-center justify-center gap-2 rounded-full bg-gold-500 px-6 py-3.5 text-base font-medium text-charcoal hover:bg-gold-600"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        تیکت جدید
      </Link>

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
          <Headset className="h-6 w-6 text-charcoal-muted" strokeWidth={1.5} />
          <p className="text-sm text-charcoal-muted">هنوز تیکتی ثبت نکرده‌اید.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/support/${ticket.id}`}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 text-sm hover:border-rose-300"
              >
                <div className="space-y-1">
                  <p className="font-medium text-charcoal">{ticket.subject}</p>
                  <p className="text-charcoal-muted">
                    {new Date(ticket.updatedAt).toLocaleDateString("fa-IR")}
                  </p>
                </div>
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                  {TICKET_STATUS_LABELS[ticket.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
