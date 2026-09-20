import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getActiveProvidersInCategory } from "@/lib/data/services";
import { ServiceProviderBrowseList } from "@/components/services/ServiceProviderBrowseList";
import { SIMPLE_SERVICE_CATEGORIES } from "@/lib/serviceCategories";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const categoryDef = SIMPLE_SERVICE_CATEGORIES.find((c) => c.servicePath === `/services/${category}`);
  return {
    title: categoryDef ? categoryDef.label : "خدمات",
    robots: { index: false, follow: false },
  };
}

// Active offerings/providers change from the provider and admin panels - must never be cached at
// build time, same reasoning as every other phase-toggle page in this app.
export const dynamic = "force-dynamic";

export default async function ServiceProviderBrowsePage({ params }: Props) {
  const { category } = await params;
  const categoryDef = SIMPLE_SERVICE_CATEGORIES.find((c) => c.servicePath === `/services/${category}`);
  if (!categoryDef) notFound();

  const session = await getSession();
  if (!session) {
    redirect(`/auth?redirect=${encodeURIComponent(categoryDef.servicePath)}`);
  }

  const city = await prisma.city.findFirst({ where: { isActive: true } });
  const providers = city ? await getActiveProvidersInCategory(categoryDef.slug, city.id) : [];

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title={categoryDef.label} backHref="/home" />
      <ServiceProviderBrowseList
        providers={providers}
        hrefFor={(providerId) => `/services/${categoryDef.slug}/${providerId}`}
      />
    </main>
  );
}
