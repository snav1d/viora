import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getServiceProviderProfile } from "@/lib/auth/provider";
import { SimpleServiceRegisterWizard } from "@/components/provider/SimpleServiceRegisterWizard";
import { SIMPLE_SERVICE_CATEGORIES } from "@/lib/serviceCategories";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const categoryDef = SIMPLE_SERVICE_CATEGORIES.find((c) => c.registerPath === `/provider/register/${category}`);
  return {
    title: categoryDef ? `ثبت‌نام پارتنر ${categoryDef.label}` : "ثبت‌نام پارتنر",
    robots: { index: false, follow: false },
  };
}

// One shared page for every "simple" service category (docs/decisions.md ADR 43) - the path
// segment is matched against lib/serviceCategories.ts's registry rather than adding a new page
// file per category.
export const dynamic = "force-dynamic";

export default async function SimpleServiceRegisterPage({ params }: Props) {
  const { category } = await params;
  const categoryDef = SIMPLE_SERVICE_CATEGORIES.find((c) => c.registerPath === `/provider/register/${category}`);
  if (!categoryDef) notFound();

  const session = await getSession();
  if (!session) {
    redirect(`/auth?redirect=${encodeURIComponent(categoryDef.registerPath)}`);
  }

  const existingProfile = await getServiceProviderProfile();
  if (existingProfile) {
    redirect("/provider");
  }

  return (
    <main className="flex flex-1 flex-col">
      <SimpleServiceRegisterWizard categorySlug={categoryDef.slug} categoryLabel={categoryDef.label} />
    </main>
  );
}
