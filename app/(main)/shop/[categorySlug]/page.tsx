import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { ProductCard } from "@/components/shop/ProductCard";
import { getCategoryBySlug, getProductsByCategoryId } from "@/lib/data/catalog";
import { toNumber } from "@/lib/decimal";

type Props = { params: Promise<{ categorySlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await getCategoryBySlug(categorySlug);
  return { title: category?.name ?? "دسته‌بندی" };
}

export default async function CategoryProductsPage({ params }: Props) {
  const { categorySlug } = await params;
  const category = await getCategoryBySlug(categorySlug);
  if (!category || !category.isActive) notFound();

  const products = await getProductsByCategoryId(category.id);

  return (
    <main className="flex flex-1 flex-col">
      <TopBar title={category.name} backHref="/shop" />
      <div className="px-4 py-5">
        {products.length === 0 ? (
          <p className="py-10 text-center text-sm text-charcoal-muted">
            فعلاً محصولی در این دسته‌بندی موجود نیست.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                slug={product.slug}
                title={product.title}
                price={toNumber(product.price)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
