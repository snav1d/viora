import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { ServiceOfferingForm } from "@/components/provider/ServiceOfferingForm";
import { getServiceProviderProfile } from "@/lib/auth/provider";
import { getMyServiceOfferingDetail } from "@/lib/data/provider";
import { toNumber } from "@/lib/decimal";
import { PRINT_CATEGORY_SLUG } from "@/lib/serviceCategories";

export const metadata: Metadata = {
  title: "ویرایش خدمت",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditProviderServicePage({ params }: Props) {
  const { id } = await params;
  // Never null here: the (panel) layout already redirected/blocked every other case before
  // rendering this page.
  const profile = (await getServiceProviderProfile())!;
  if (profile.category.slug === PRINT_CATEGORY_SLUG) {
    redirect("/provider/offering");
  }
  const offering = await getMyServiceOfferingDetail(profile.id, id);
  if (!offering) notFound();

  return (
    <main className="flex flex-1 flex-col">
      <TopBar title="ویرایش خدمت" backHref="/provider/services" />
      <ServiceOfferingForm
        endpoint={`/api/provider/services/${offering.id}`}
        method="PATCH"
        showActiveToggle
        initial={{
          title: offering.title,
          description: offering.description,
          price: toNumber(offering.basePrice),
          isActive: offering.isActive,
        }}
        submitLabel="ذخیره تغییرات"
        redirectTo="/provider/services"
      />
    </main>
  );
}
