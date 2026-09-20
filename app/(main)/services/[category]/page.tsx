import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getActiveSimpleServiceOfferings } from "@/lib/data/services";
import { SimpleServiceOrderFlow } from "@/components/services/SimpleServiceOrderFlow";
import { SIMPLE_SERVICE_CATEGORIES } from "@/lib/serviceCategories";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const categoryDef = SIMPLE_SERVICE_CATEGORIES.find((c) => c.servicePath === `/services/${category}`);
  return {
    title: categoryDef ? `سفارش ${categoryDef.label}` : "سفارش خدمات",
    robots: { index: false, follow: false },
  };
}

// Active offerings/providers change from the provider and admin panels - must never be cached at
// build time, same reasoning as every other phase-toggle page in this app.
export const dynamic = "force-dynamic";

export default async function SimpleServiceOrderPage({ params }: Props) {
  const { category } = await params;
  const categoryDef = SIMPLE_SERVICE_CATEGORIES.find((c) => c.servicePath === `/services/${category}`);
  if (!categoryDef) notFound();

  const session = await getSession();
  if (!session) {
    redirect(`/auth?redirect=${encodeURIComponent(categoryDef.servicePath)}`);
  }

  const city = await prisma.city.findFirst({ where: { isActive: true } });
  const listings = city ? await getActiveSimpleServiceOfferings(categoryDef.slug, city.id) : [];

  return (
    <main className="flex flex-1 flex-col">
      <SimpleServiceOrderFlow
        categorySlug={categoryDef.slug}
        categoryLabel={categoryDef.label}
        customFields={categoryDef.customFields}
        listings={listings}
      />
    </main>
  );
}
