import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getServiceProviderProfile } from "@/lib/auth/provider";
import { ProviderRegisterWizard } from "@/components/provider/ProviderRegisterWizard";

export const metadata: Metadata = {
  title: "ثبت‌نام پارتنر تولید",
  robots: { index: false, follow: false },
};

export default async function ProviderRegisterPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth?redirect=%2Fprovider%2Fregister");
  }

  const existingProfile = await getServiceProviderProfile();
  if (existingProfile) {
    redirect("/provider");
  }

  return (
    <main className="flex flex-1 flex-col">
      <ProviderRegisterWizard />
    </main>
  );
}
