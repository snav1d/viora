import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FloatingBackButton } from "@/components/nav/FloatingBackButton";
import { ProductPlaceholder } from "@/components/shop/ProductCard";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
import { OtherSellersList } from "@/components/shop/OtherSellersList";
import { SellerAvatar } from "@/components/shop/SellerAvatar";
import { ReviewList } from "@/components/reviews/ReviewList";
import { getProductBySlug } from "@/lib/data/catalog";
import { getProductReviewSummary } from "@/lib/data/reviews";
import { parseProductImages } from "@/lib/data/seller";
import { toNumber } from "@/lib/decimal";
import { applyPlatformMarkup } from "@/lib/pricing";
import { siteConfig } from "@/lib/config/site";

type Props = { params: Promise<{ slug: string }> };

// This page now shows live review data (docs/decisions.md ADR 33) - without this, a newly
// submitted review would never appear here until the next deploy, since a dynamic-segment page
// with no generateStaticParams is otherwise cached after its first render.
export const dynamic = "force-dynamic";

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
  if (!product) notFound();

  const { listing } = product;
  // price/discountPrice stay the seller's own raw figures - only used below for otherListings
  // (which apply the markup themselves in OtherSellersList). Every number actually shown or
  // charged here goes through applyPlatformMarkup first (docs/decisions.md ADR 45).
  const price = toNumber(listing.price);
  const discountPrice = listing.discountPrice ? toNumber(listing.discountPrice) : null;
  const displayPrice = applyPlatformMarkup(price);
  const displayDiscountPrice = discountPrice ? applyPlatformMarkup(discountPrice) : null;
  const displayEffectivePrice = displayDiscountPrice ?? displayPrice;
  const reviewSummary = await getProductReviewSummary(product.id);
  const heroImage = parseProductImages(product.images)[0] ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description ?? undefined,
    url: `${siteConfig.url}/shop/product/${product.slug}`,
    offers: {
      "@type": "Offer",
      priceCurrency: "IRR",
      price: displayEffectivePrice * 10, // Toman -> Rial for schema.org (ISO 4217 has no Toman code)
      availability:
        listing.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <main className="flex flex-1 flex-col pb-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* docs/design-system.md §7-الف: TopBar is gone from this page entirely - the product
          photo is the literal first pixel, full-bleed, with the back button floating on the
          image itself instead of sitting in a strip above it. */}
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URL, not a local /public asset next/image can optimize
          <img src={heroImage} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <ProductPlaceholder className="h-full w-full" />
        )}
        <FloatingBackButton href={`/shop/${product.category.slug}`} />
      </div>

      <div className="flex flex-col gap-5 px-4 py-5">
        <div className="space-y-2">
          <p className="text-xs text-charcoal-muted">{product.category.name}</p>
          {/* docs/design-system.md §4: Display role (28px Bold) for a single product's own
              title - the one place on this page that earns the biggest type on the page. */}
          <h1 className="text-[28px] font-bold leading-tight text-charcoal">{product.title}</h1>
          {displayDiscountPrice ? (
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-charcoal">
                {displayDiscountPrice.toLocaleString("fa-IR")} تومان
              </p>
              <p className="text-sm text-charcoal-muted line-through">
                {displayPrice.toLocaleString("fa-IR")} تومان
              </p>
            </div>
          ) : (
            <p className="text-xl font-bold text-charcoal">
              {displayPrice.toLocaleString("fa-IR")} تومان
            </p>
          )}
        </div>

        {product.description ? (
          <p className="text-sm leading-7 text-charcoal-muted">{product.description}</p>
        ) : null}

        <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
          <div>
            <dt className="text-charcoal-muted">فروشنده</dt>
            <dd className="flex items-center gap-2 font-medium text-charcoal">
              <SellerAvatar url={listing.seller.avatarUrl} name={listing.seller.businessName} className="h-6 w-6" />
              {listing.seller.businessName}
            </dd>
          </div>
          <div>
            <dt className="text-charcoal-muted">شهر ارسال</dt>
            <dd className="font-medium text-charcoal">{listing.city.name}</dd>
          </div>
        </dl>

        <AddToCartButton
          listingId={listing.id}
          slug={product.slug}
          title={product.title}
          price={displayEffectivePrice}
        />

        <OtherSellersList
          listings={product.otherListings.map((other) => ({
            id: other.id,
            price: toNumber(other.price),
            discountPrice: other.discountPrice ? toNumber(other.discountPrice) : null,
            sellerName: other.seller.businessName,
            sellerAvatarUrl: other.seller.avatarUrl,
          }))}
          productSlug={product.slug}
          productTitle={product.title}
        />

        <ReviewList summary={reviewSummary} />
      </div>
    </main>
  );
}
