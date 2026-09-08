import type { Metadata } from "next";
import { PhoneForm } from "@/components/auth/PhoneForm";
import { TopBar } from "@/components/nav/TopBar";

export const metadata: Metadata = {
  title: "ورود",
  robots: { index: false, follow: false },
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <TopBar title="ورود به ویورا" backHref="/" />
      <PhoneForm redirectTo={redirect ?? "/home"} />
    </main>
  );
}
