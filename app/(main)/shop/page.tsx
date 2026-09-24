import type { Metadata } from "next";
import { Search } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ProductCard } from "@/components/shop/ProductCard";
import { getActiveProductCategories, searchProducts } from "@/lib/data/catalog";
import { toNumber } from "@/lib/decimal";

export const metadata: Metadata = {
  title: "فروشگاه",
  description: "لوازم تولد و جشن از فروشنده‌های معتبر تهران.",
};

// Category list/catalog is admin-editable and search results change live - never frozen at build
// time.
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function ShopPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const [categories, products] = await Promise.all([
    getActiveProductCategories(),
    query.length >= 2 ? searchProducts(query) : Promise.resolve(null),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <TopBar title="فروشگاه" backHref="/home" />
      <div className="flex flex-col gap-4 px-4 py-5">
        <form className="relative" method="get">
          <Search
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted"
            strokeWidth={1.75}
          />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="جستجوی محصول…"
            className="w-full rounded-2xl border border-border bg-surface py-2.5 pr-9 pl-3 text-sm text-charcoal focus:border-charcoal focus:outline-none"
          />
        </form>

        {products !== null ? (
          products.length === 0 ? (
            <p className="py-10 text-center text-sm text-charcoal-muted">
              محصولی با این نام پیدا نشد.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  slug={product.slug}
                  title={product.title}
                  price={toNumber(product.listing.price)}
                  discountPrice={
                    product.listing.discountPrice ? toNumber(product.listing.discountPrice) : null
                  }
                />
              ))}
            </div>
          )
        ) : (
          <>
            <p className="text-sm text-charcoal-muted">یک دسته‌بندی را انتخاب کنید.</p>
            <CategoryGrid categories={categories} />
          </>
        )}
      </div>
    </main>
  );
}
