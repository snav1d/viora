import type { Metadata } from "next";
import { redirect as redirectTo } from "next/navigation";
import { OtpForm } from "@/components/auth/OtpForm";
import { TopBar } from "@/components/nav/TopBar";

export const metadata: Metadata = {
  title: "تایید کد",
  robots: { index: false, follow: false },
};

export default async function VerifyOtpPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; redirect?: string }>;
}) {
  const { phone, redirect } = await searchParams;

  if (!phone) {
    redirectTo("/auth");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <TopBar title="تایید کد" backHref="/auth" />
      <OtpForm phone={phone} redirectTo={redirect ?? "/home"} />
    </main>
  );
}
