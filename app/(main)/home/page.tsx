import type { Metadata } from "next";
import { Sparkles, Printer, PartyPopper, Camera } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { HomeBanner } from "@/components/home/HomeBanner";
import { ProductCard } from "@/components/shop/ProductCard";
import { getActiveProductCategories, getFeaturedProducts } from "@/lib/data/catalog";
import { getActiveBanner } from "@/lib/data/banners";
import { toNumber } from "@/lib/decimal";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "خانه",
};

// Catalog/category data is admin-editable and must never be frozen at build time.
export const dynamic = "force-dynamic";

// Each active SERVICE category's customer-facing shortcut (docs/decisions.md ADR 43) - print
// keeps its own dedicated /print flow, balloon-decor/photography use the shared /services/[slug]
// route. Adding a future service category here is one array entry, not a new section block.
const SERVICE_SHORTCUTS = [
  {
    href: "/print",
    icon: Printer,
    title: "چاپ بادکنک تبلیغاتی",
    subtitle: "طرح خودتون رو بفرستید، بهترین پارتنر رو پیدا کنید.",
  },
  {
    href: "/services/balloon-decor",
    icon: PartyPopper,
    title: "بادکنک‌آرایی مجالس",
    subtitle: "اجرای حرفه‌ای بادکنک‌آرایی رو برای جشن‌تون رزرو کنید.",
  },
  {
    href: "/services/photography",
    icon: Camera,
    title: "عکاسی جشن",
    subtitle: "بهترین عکاس‌ها رو برای ثبت لحظه‌های جشن‌تون پیدا کنید.",
  },
] as const;

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  alternateName: siteConfig.nameLatin,
  url: siteConfig.url,
  description: siteConfig.description,
};

export default async function HomePage() {
  const [categories, products, banner] = await Promise.all([
    getActiveProductCategories(),
    getFeaturedProducts(6),
    getActiveBanner("HOME_TOP"),
  ]);

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

      {SERVICE_SHORTCUTS.map((shortcut) => (
        <section
          key={shortcut.href}
          className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-4"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <shortcut.icon className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="flex-1 space-y-0.5">
            <h2 className="text-sm font-semibold text-charcoal">{shortcut.title}</h2>
            <p className="text-xs text-charcoal-muted">{shortcut.subtitle}</p>
          </div>
          <ButtonLink href={shortcut.href} variant="secondary" size="md" className="shrink-0">
            سفارش
          </ButtonLink>
        </section>
      ))}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-charcoal">دسته‌بندی‌ها</h2>
          <ButtonLink href="/shop" variant="ghost" size="md" className="h-auto p-0 text-xs text-rose-600">
            مشاهده فروشگاه
          </ButtonLink>
        </div>
        <CategoryGrid categories={categories} />
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
