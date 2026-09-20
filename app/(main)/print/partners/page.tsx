import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { ServiceProviderBrowseList } from "@/components/services/ServiceProviderBrowseList";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getActivePrintPartners } from "@/lib/data/print";

export const metadata: Metadata = {
  title: "چاپ بادکنک تبلیغاتی",
  robots: { index: false, follow: false },
};

// Active partners/portfolios change from the provider and admin panels - must never be cached at
// build time, same reasoning as every other phase-toggle page in this app.
export const dynamic = "force-dynamic";

/// Partner-first browse page for print (docs/decisions.md ADR 44 item 5) - a customer can pick a
/// partner directly here (leading into the same finish/color/quantity form, pre-scoped to that
/// one partner) or use "ثبت سفارش جدید" for the existing full auto-matching flow at /print,
/// unchanged. Both paths coexist deliberately - print's own tiered pricing/matching logic is not
/// being replaced by this new browse page.
export default async function PrintPartnersPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth?redirect=%2Fprint%2Fpartners");
  }

  const city = await prisma.city.findFirst({ where: { isActive: true } });
  const partners = city ? await getActivePrintPartners(city.id) : [];

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title="چاپ بادکنک تبلیغاتی" backHref="/home" />

      <Link
        href="/print"
        className="flex items-center justify-center gap-2 rounded-full bg-gold-500 py-3 text-sm font-medium text-charcoal hover:bg-gold-600"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        ثبت سفارش جدید
      </Link>

      <ServiceProviderBrowseList
        providers={partners.map((partner) => ({
          providerId: partner.providerId,
          businessName: partner.businessName,
          isVerifiedByViora: partner.isVerifiedByViora,
          portfolioImages: partner.portfolioImages,
        }))}
        hrefFor={(providerId) => {
          const partner = partners.find((p) => p.providerId === providerId)!;
          return `/print?offering=${partner.offeringId}`;
        }}
      />
    </main>
  );
}
