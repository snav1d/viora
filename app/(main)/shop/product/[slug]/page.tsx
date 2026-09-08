import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { ProductPlaceholder } from "@/components/shop/ProductCard";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
import { getProductBySlug } from "@/lib/data/catalog";
import { toNumber } from "@/lib/decimal";
import { siteConfig } from "@/lib/config/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "محصول" };

  return {
    title: product.title,
    description: product.description ?? undefined,
    openGraph: { title: product.title, description: product.description ?? undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.isActive) notFound();

  const price = toNumber(product.price);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description ?? undefined,
    url: `${siteConfig.url}/shop/product/${product.slug}`,
    offers: {
      "@type": "Offer",
      priceCurrency: "IRR",
      price: price * 10, // Toman -> Rial for schema.org (ISO 4217 has no Toman code)
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <main className="flex flex-1 flex-col pb-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TopBar title={product.title} backHref={`/shop/${product.category.slug}`} />

      <div className="flex flex-col gap-5 px-4 py-5">
        <ProductPlaceholder className="aspect-square w-full" />

        <div className="space-y-2">
          <p className="text-xs text-charcoal-muted">{product.category.name}</p>
          <h1 className="text-lg font-semibold text-charcoal">{product.title}</h1>
          <p className="text-xl font-bold text-rose-700">{price.toLocaleString("fa-IR")} تومان</p>
        </div>

        {product.description ? (
          <p className="text-sm leading-7 text-charcoal-muted">{product.description}</p>
        ) : null}

        <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
          <div>
            <dt className="text-charcoal-muted">فروشنده</dt>
            <dd className="font-medium text-charcoal">{product.seller.businessName}</dd>
          </div>
          <div>
            <dt className="text-charcoal-muted">شهر ارسال</dt>
            <dd className="font-medium text-charcoal">{product.city.name}</dd>
          </div>
        </dl>

        <AddToCartButton
          productId={product.id}
          slug={product.slug}
          title={product.title}
          price={price}
        />
      </div>
    </main>
  );
}
