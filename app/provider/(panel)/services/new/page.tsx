import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { ServiceOfferingForm } from "@/components/provider/ServiceOfferingForm";
import { getServiceProviderProfile } from "@/lib/auth/provider";
import { PRINT_CATEGORY_SLUG } from "@/lib/serviceCategories";

export const metadata: Metadata = {
  title: "افزودن خدمت",
  robots: { index: false, follow: false },
};

export default async function NewProviderServicePage() {
  // Never null here: the (panel) layout already redirected/blocked every other case before
  // rendering this page.
  const profile = (await getServiceProviderProfile())!;
  if (profile.category.slug === PRINT_CATEGORY_SLUG) {
    redirect("/provider/offering");
  }

  return (
    <main className="flex flex-1 flex-col">
      <TopBar title="افزودن خدمت" backHref="/provider/services" />
      <ServiceOfferingForm
        endpoint="/api/provider/services"
        method="POST"
        showActiveToggle={false}
        submitLabel="افزودن خدمت"
        redirectTo="/provider/services"
      />
    </main>
  );
}
