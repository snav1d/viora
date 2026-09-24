import type { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { HomeBanner } from "@/components/home/HomeBanner";
import { ServiceCategoryGrid } from "@/components/services/ServiceCategoryGrid";
import { FeaturedProviderStrip } from "@/components/services/FeaturedProviderStrip";
import { prisma } from "@/lib/prisma";
import { getActiveServiceCategories } from "@/lib/data/catalog";
import { getActiveBanner } from "@/lib/data/banners";
import { getVioraRecommendedProviders, getVioraNewestProviders } from "@/lib/data/services";
import { getServiceCategoryHref } from "@/lib/serviceCategories";

export const metadata: Metadata = {
  title: "خدمات",
};

// Category/provider/banner data is all admin- or provider-editable and must never be frozen at
// build time.
export const dynamic = "force-dynamic";

// A dedicated services destination, separate from the product shop (docs/decisions.md ADR 45) -
// its own hero banner slot, a bigger/more visual category grid than the shop's, and two
// cross-category horizontal rows (verified partners, newest-approved partners) that a single
// category's own browse page has no room for.
export default async function ServicesPage() {
  const city = await prisma.city.findFirst({ where: { isActive: true } });

  const [categories, banner, recommended, newest] = await Promise.all([
    getActiveServiceCategories(),
    getActiveBanner("SERVICES_HERO"),
    city ? getVioraRecommendedProviders(city.id) : Promise.resolve([]),
    city ? getVioraNewestProviders(city.id) : Promise.resolve([]),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 pb-6 pt-5">
      <TopBar title="خدمات" backHref="/home" />

      {banner ? <HomeBanner imageUrl={banner.imageUrl} text={banner.text} link={banner.link} /> : null}

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-charcoal">دسته‌بندی خدمات</h2>
        <ServiceCategoryGrid
          categories={categories.map((category) => ({
            slug: category.slug,
            name: category.name,
            href: getServiceCategoryHref(category.slug),
          }))}
        />
      </section>

      <FeaturedProviderStrip title="پیشنهاد ویژه‌ی ویورا" providers={recommended} />
      <FeaturedProviderStrip title="تازه‌های ویورا" providers={newest} />
    </main>
  );
}
