import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { ServiceBookingForm } from "@/components/services/ServiceBookingForm";
import { getSession } from "@/lib/auth/session";
import { getBookableOffering } from "@/lib/data/services";
import { SIMPLE_SERVICE_CATEGORIES } from "@/lib/serviceCategories";

type Props = { params: Promise<{ category: string; providerId: string; offeringId: string }> };

export const metadata: Metadata = {
  title: "تایید سفارش",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ServiceBookingPage({ params }: Props) {
  const { category, providerId, offeringId } = await params;
  const categoryDef = SIMPLE_SERVICE_CATEGORIES.find((c) => c.servicePath === `/services/${category}`);
  if (!categoryDef) notFound();

  const session = await getSession();
  if (!session) {
    redirect(`/auth?redirect=${encodeURIComponent(`/services/${category}/${providerId}/book/${offeringId}`)}`);
  }

  const offering = await getBookableOffering(offeringId, providerId, categoryDef.slug);
  if (!offering) notFound();

  return (
    <main className="flex flex-1 flex-col">
      <TopBar title="تایید سفارش" backHref={`/services/${categoryDef.slug}/${providerId}`} />
      <div className="px-6 pt-2">
        <dl className="rounded-2xl border border-border bg-surface p-4 text-sm">
          <div>
            <dt className="text-charcoal-muted">پارتنر</dt>
            <dd className="font-medium text-charcoal">{offering.businessName}</dd>
          </div>
          <div className="mt-2">
            <dt className="text-charcoal-muted">خدمت</dt>
            <dd className="font-medium text-charcoal">{offering.title}</dd>
          </div>
        </dl>
      </div>
      <ServiceBookingForm categorySlug={categoryDef.slug} offeringId={offering.id} price={offering.price} />
    </main>
  );
}
