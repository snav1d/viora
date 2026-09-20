import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { PrintOfferingSettingsForm } from "@/components/provider/PrintOfferingSettingsForm";
import { getServiceProviderProfile } from "@/lib/auth/provider";
import { getMyPrintOffering } from "@/lib/data/provider";
import { getPrintColorNames } from "@/lib/data/print";
import { toNumber } from "@/lib/decimal";

export const metadata: Metadata = {
  title: "تعرفه و تنظیمات چاپ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function parseColors(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/// Print-only from ADR 44 onward - a "simple" category provider manages any number of their own
/// named/priced ServiceOfferings from /provider/services instead (superseding ADR 43's
/// category-agnostic version of this page).
export default async function ProviderOfferingPage() {
  // Never null here: the (panel) layout already redirected/blocked every other case before
  // rendering this page.
  const profile = (await getServiceProviderProfile())!;
  const offering = await getMyPrintOffering(profile.id);
  if (!offering) {
    redirect("/provider/services");
  }

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 py-5">
      <TopBar title="تعرفه و تنظیمات چاپ" backHref="/provider" />
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
    </main>
  );
}
