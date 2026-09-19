"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart/CartContext";
import { SellerAvatar } from "@/components/shop/SellerAvatar";

const INITIAL_VISIBLE_COUNT = 4;

type OtherListing = {
  id: string;
  price: number;
  discountPrice: number | null;
  sellerName: string;
  sellerAvatarUrl: string | null;
};

/// Below the main price/buy area (docs/decisions.md ADR 41/42) - only rendered when more than one
/// seller carries this Product. Open by default (at least the cheapest `INITIAL_VISIBLE_COUNT`
/// rows, already sorted cheapest-first by the caller) rather than a closed accordion, with a
/// "مشاهده‌ی همه" button revealing the rest only when there are more than that. Picking a row adds
/// that specific Listing straight to the cart, independent of whichever Listing is shown as the
/// page's own default (cheapest-first) selection above.
export function OtherSellersList({
  listings,
  productSlug,
  productTitle,
}: {
  listings: OtherListing[];
  productSlug: string;
  productTitle: string;
}) {
  const { addItem } = useCart();
  const [showAll, setShowAll] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);

  if (listings.length === 0) return null;

  const visibleListings = showAll ? listings : listings.slice(0, INITIAL_VISIBLE_COUNT);
  const hiddenCount = listings.length - visibleListings.length;

  return (
    <div className="rounded-2xl border border-border bg-surface">
      <p className="px-4 py-3 text-sm font-medium text-charcoal">
        سایر فروشنده‌های این محصول ({listings.length.toLocaleString("fa-IR")})
      </p>
      <ul className="flex flex-col divide-y divide-border border-t border-border">
        {visibleListings.map((listing) => {
          const effectivePrice = listing.discountPrice ?? listing.price;
          return (
            <li key={listing.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                <SellerAvatar
                  url={listing.sellerAvatarUrl}
                  name={listing.sellerName}
                  className="h-8 w-8"
                />
                <div className="space-y-0.5">
                  <p className="text-charcoal">{listing.sellerName}</p>
                  <p className="font-medium text-rose-700">
                    {effectivePrice.toLocaleString("fa-IR")} تومان
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  addItem({
                    listingId: listing.id,
                    slug: productSlug,
                    title: productTitle,
                    price: effectivePrice,
                  });
                  setAddedId(listing.id);
                  setTimeout(
                    () => setAddedId((current) => (current === listing.id ? null : current)),
                    1500,
                  );
                }}
                className="shrink-0 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
              >
                {addedId === listing.id ? "اضافه شد" : "افزودن"}
              </button>
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full border-t border-border py-2.5 text-center text-sm font-medium text-rose-700 hover:bg-rose-50"
        >
          مشاهده‌ی همه ({listings.length.toLocaleString("fa-IR")})
        </button>
      ) : null}
    </div>
  );
}
