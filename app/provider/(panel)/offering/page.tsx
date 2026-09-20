import type { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { PrintOfferingSettingsForm } from "@/components/provider/PrintOfferingSettingsForm";
import { SimpleOfferingSettingsForm } from "@/components/provider/SimpleOfferingSettingsForm";
import { getServiceProviderProfile } from "@/lib/auth/provider";
import { getMyServiceOffering } from "@/lib/data/provider";
import { getPrintColorNames } from "@/lib/data/print";
import { toNumber } from "@/lib/decimal";
import { PRINT_CATEGORY_SLUG, getSimpleServiceCategory, parseCustomFieldValues } from "@/lib/serviceCategories";

export const metadata: Metadata = {
  title: "تعرفه و تنظیمات پیشنهاد",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function parseColors(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export default async function ProviderOfferingPage() {
  // Never null here: the (panel) layout already redirected/blocked every other case before
  // rendering this page.
  const profile = (await getServiceProviderProfile())!;
  const offering = await getMyServiceOffering(profile.id);

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 py-5">
      <TopBar title="تعرفه و تنظیمات پیشنهاد" backHref="/provider" />

      {!offering ? (
        <p className="py-10 text-center text-sm text-charcoal-muted">پیشنهادی برای این حساب پیدا نشد.</p>
      ) : offering.category.slug === PRINT_CATEGORY_SLUG ? (
        <PrintOfferingSettingsForm
          colors={await getPrintColorNames()}
          initialSupportsChrome={offering.supportsChrome}
          initialSupportsMatte={offering.supportsMatte}
          initialColors={parseColors(offering.printableColors)}
          initialMinOrderQuantity={offering.minOrderQuantity ?? 0}
          initialTiers={offering.pricingTiers.map((tier) => ({
            minQuantity: String(tier.minQuantity),
            maxQuantity: tier.maxQuantity ? String(tier.maxQuantity) : "",
            unitPrice: String(toNumber(tier.unitPrice)),
          }))}
        />
      ) : (
        (() => {
          const categoryDef = getSimpleServiceCategory(offering.category.slug);
          return (
            <SimpleOfferingSettingsForm
              customFields={categoryDef?.customFields ?? []}
              initialBasePrice={toNumber(offering.basePrice)}
              initialCustomFieldValues={parseCustomFieldValues(offering.customFieldsSchema)}
            />
          );
        })()
      )}
    </main>
  );
}
