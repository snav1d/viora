import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getServiceProviderProfile } from "@/lib/auth/provider";
import { getPrintColorNames } from "@/lib/data/print";
import { ProviderRegisterWizard } from "@/components/provider/ProviderRegisterWizard";

export const metadata: Metadata = {
  title: "ثبت‌نام پارتنر تولید",
  robots: { index: false, follow: false },
};

// The color checklist is admin-editable (docs/decisions.md ADR 32) and must never be frozen at
// build time, same reasoning as every other phase-toggle page in this app.
export const dynamic = "force-dynamic";

export default async function ProviderRegisterPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth?redirect=%2Fprovider%2Fregister");
  }

  const existingProfile = await getServiceProviderProfile();
  if (existingProfile) {
    redirect("/provider");
  }

  const colors = await getPrintColorNames();

  return (
    <main className="flex flex-1 flex-col">
      <ProviderRegisterWizard colors={colors} />
    </main>
  );
}
