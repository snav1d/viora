import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { HomeBanner } from "@/components/home/HomeBanner";
import { ProductCard } from "@/components/shop/ProductCard";
import { getActiveProductCategories, getActiveServiceCategories, getFeaturedProducts } from "@/lib/data/catalog";
import { getActiveBanner } from "@/lib/data/banners";
import { toNumber } from "@/lib/decimal";
import { siteConfig } from "@/lib/config/site";
import { PRINT_CATEGORY_SLUG, SIMPLE_SERVICE_CATEGORIES } from "@/lib/serviceCategories";

export const metadata: Metadata = {
  title: "خانه",
};

// Catalog/category data is admin-editable and must never be frozen at build time.
export const dynamic = "force-dynamic";

// Where each SERVICE category's own browse page lives (docs/decisions.md ADR 44 item 5) - print
// keeps its own dedicated partner-first browse page, every "simple" category uses the shared
// /services/[slug] route. A future new category needs no change here beyond its own registry
// entry.
const SERVICE_CATEGORY_HREFS: Record<string, string> = {
  [PRINT_CATEGORY_SLUG]: "/print/partners",
  ...Object.fromEntries(SIMPLE_SERVICE_CATEGORIES.map((category) => [category.slug, category.servicePath])),
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  alternateName: siteConfig.nameLatin,
  url: siteConfig.url,
  description: siteConfig.description,
};

export default async function HomePage() {
  const [productCategories, serviceCategories, products, banner] = await Promise.all([
    getActiveProductCategories(),
    getActiveServiceCategories(),
    getFeaturedProducts(6),
    getActiveBanner("HOME_TOP"),
  ]);

  const gridCategories = [
    ...productCategories.map((category) => ({ slug: category.slug, name: category.name })),
    ...serviceCategories.map((category) => ({
      slug: category.slug,
      name: category.name,
      href: SERVICE_CATEGORY_HREFS[category.slug],
    })),
  ];

  return (
    <main className="flex flex-1 flex-col gap-8 px-4 pb-6 pt-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      {banner ? <HomeBanner imageUrl={banner.imageUrl} text={banner.text} link={banner.link} /> : null}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs text-charcoal-muted">سلام 👋</p>
          <h1 className="text-lg font-semibold text-charcoal">جشنت رو با ویورا بساز</h1>
        </div>
      </header>

      <section className="overflow-hidden rounded-3xl bg-gradient-to-l from-rose-100 via-rose-50 to-gold-100 p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-gold-600">
            <Sparkles className="h-5 w-5" strokeWidth={1.75} />
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

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-charcoal">دسته‌بندی‌ها</h2>
          <ButtonLink href="/shop" variant="ghost" size="md" className="h-auto p-0 text-xs text-rose-600">
            مشاهده فروشگاه
          </ButtonLink>
        </div>
        <CategoryGrid categories={gridCategories} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-charcoal">محصولات پیشنهادی</h2>
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
