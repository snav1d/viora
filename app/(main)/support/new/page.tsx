import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { NewTicketForm } from "@/components/support/NewTicketForm";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "تیکت جدید",
  robots: { index: false, follow: false },
};

export default async function NewTicketPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth?redirect=%2Fsupport%2Fnew");
  }

  return (
    <main className="flex flex-1 flex-col">
      <TopBar title="تیکت جدید" backHref="/support" />
      <NewTicketForm />
    </main>
  );
}
