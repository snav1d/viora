import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { ProductForm } from "@/components/seller/ProductForm";
import { DeleteProductButton } from "@/components/seller/DeleteProductButton";
import { getSellerProfile } from "@/lib/auth/seller";
import { getSellerListingById, parseProductImages } from "@/lib/data/seller";
import { getActiveCities, getActiveProductCategories } from "@/lib/data/catalog";
import { PRODUCT_STATUS_LABELS } from "@/lib/labels";
import { toNumber } from "@/lib/decimal";

export const metadata: Metadata = {
  title: "ویرایش محصول",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }> };

export default async function EditSellerProductPage({ params }: Props) {
  const { id } = await params;
  // Never null here: the (panel) layout already redirected/blocked every other case before
  // rendering this page.
  const profile = (await getSellerProfile())!;
  const listing = await getSellerListingById(profile.id, id);
  if (!listing) notFound();

  const { product } = listing;

  const [cities, categories] = await Promise.all([getActiveCities(), getActiveProductCategories()]);
  const cityOptions = cities.map((city) => ({ id: city.id, name: city.name }));
  const categoryOptions = categories.map((category) => ({ id: category.id, name: category.name }));

  const listingInput = {
    cityId: listing.cityId,
    price: toNumber(listing.price),
    discountPrice: listing.discountPrice ? toNumber(listing.discountPrice) : null,
    stock: listing.stock,
    isActive: listing.isActive,
  };

  // Only the seller who originally submitted this catalog entry can still edit its catalog
  // fields, and only while it hasn't been finally decided one way or another (docs/decisions.md
  // ADR 39) - everyone else (and every already-APPROVED product) only ever edits their own
  // Listing terms below.
  const canEditCatalog =
    product.submittedBySellerId === profile.id &&
    (product.status === "PENDING_REVIEW" || product.status === "NEEDS_REVISION");

  return (
    <main className="flex flex-1 flex-col">
      <TopBar title="ویرایش محصول" backHref="/seller/products" />

      {product.status !== "APPROVED" ? (
        <div className="mx-6 mb-2 rounded-2xl border border-border bg-surface p-3 text-sm">
          <p className="font-medium text-charcoal">{PRODUCT_STATUS_LABELS[product.status]}</p>
          {product.rejectionReason ? (
            <p className="mt-1 text-charcoal-muted">{product.rejectionReason}</p>
          ) : null}
        </div>
      ) : null}

      {product.status === "REJECTED" ? (
        <p className="px-6 pb-4 text-sm text-charcoal-muted">
          این محصول رد شده و قابل ویرایش یا فعال‌سازی نیست.
        </p>
      ) : (
        <ProductForm
          cities={cityOptions}
          categories={categoryOptions}
          endpoint={`/api/seller/listings/${listing.id}`}
          method="PATCH"
          showCatalogFields={canEditCatalog}
          showActiveToggle={!canEditCatalog}
          catalog={
            canEditCatalog
              ? {
                  title: product.title,
                  description: product.description,
                  categoryId: product.categoryId,
                  images: parseProductImages(product.images),
                }
              : undefined
          }
          listing={listingInput}
          submitLabel={canEditCatalog ? "ثبت و ارسال دوباره برای بررسی" : "ذخیره تغییرات"}
          redirectTo="/seller/products"
        />
      )}

      <DeleteProductButton listingId={listing.id} />
    </main>
  );
}
