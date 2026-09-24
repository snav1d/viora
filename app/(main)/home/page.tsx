import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { HomeBanner } from "@/components/home/HomeBanner";
import { PromoStrip } from "@/components/home/PromoStrip";
import { ProductCard } from "@/components/shop/ProductCard";
import { getActiveProductCategories, getActiveServiceCategories, getFeaturedProducts } from "@/lib/data/catalog";
import { getActiveBanner, getActiveBanners } from "@/lib/data/banners";
import { toNumber } from "@/lib/decimal";
import { siteConfig } from "@/lib/config/site";
import { getServiceCategoryHref } from "@/lib/serviceCategories";

export const metadata: Metadata = {
  title: "خانه",
};

// Catalog/category data is admin-editable and must never be frozen at build time.
export const dynamic = "force-dynamic";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  alternateName: siteConfig.nameLatin,
  url: siteConfig.url,
  description: siteConfig.description,
};

export default async function HomePage() {
  const [productCategories, serviceCategories, products, banner, promoBanners] = await Promise.all([
    getActiveProductCategories(),
    getActiveServiceCategories(),
    getFeaturedProducts(6),
    getActiveBanner("HOME_HERO"),
    getActiveBanners("HOME_PROMO_STRIP"),
  ]);

  const gridCategories = [
    ...productCategories.map((category) => ({ slug: category.slug, name: category.name })),
    ...serviceCategories.map((category) => ({
      slug: category.slug,
      name: category.name,
      href: getServiceCategoryHref(category.slug),
    })),
  ];

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 pb-6 pt-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      {banner ? <HomeBanner imageUrl={banner.imageUrl} text={banner.text} link={banner.link} /> : null}
      <PromoStrip banners={promoBanners} />
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs text-charcoal-muted">سلام 👋</p>
          <h1 className="text-xl font-bold text-charcoal">جشنت رو با ویورا بساز</h1>
        </div>
      </header>

      {/* docs/design-system.md §6: a calm single-tone wash, not a multi-color gradient - the
          reference builds interest through photography/typography, not decorative color. */}
      <section className="overflow-hidden rounded-3xl bg-rose-50 p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-rose-600">
            <Sparkles className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-charcoal">جشن‌ساز ویورا</h2>
            <p className="text-sm leading-6 text-charcoal-muted">
              سن، تعداد مهمان، بودجه و تم رو بگو تا یک سبد پیشنهادی کامل برات بسازیم.
            </p>
          </div>
        </div>
        <ButtonLink href="/wizard" size="md" className="mt-4 w-full">
          شروع جشن‌ساز
        </ButtonLink>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-charcoal">دسته‌بندی‌ها</h2>
          <div className="flex items-center gap-3">
            <ButtonLink href="/services" variant="ghost" size="md" className="h-auto p-0 text-xs text-rose-600">
              مشاهده خدمات
            </ButtonLink>
            <ButtonLink href="/shop" variant="ghost" size="md" className="h-auto p-0 text-xs text-rose-600">
              مشاهده فروشگاه
            </ButtonLink>
          </div>
        </div>
        <CategoryGrid categories={gridCategories} />
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-charcoal">محصولات پیشنهادی</h2>
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              slug={product.slug}
              title={product.title}
              price={toNumber(product.listing.price)}
              discountPrice={product.listing.discountPrice ? toNumber(product.listing.discountPrice) : null}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
