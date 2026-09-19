"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useCart } from "@/lib/cart/CartContext";
import { cn } from "@/lib/cn";

type OtherListing = {
  id: string;
  price: number;
  discountPrice: number | null;
  sellerName: string;
};

/// Compact, collapsed-by-default accordion below the main price/buy area (docs/decisions.md
/// ADR 41) - only rendered when more than one seller carries this Product. Picking a row adds
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
  const [open, setOpen] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);

  if (listings.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-charcoal"
        aria-expanded={open}
      >
        <span>سایر فروشنده‌های این محصول ({listings.length.toLocaleString("fa-IR")})</span>
        <ChevronDown
          className={cn("h-4 w-4 text-charcoal-muted transition-transform", open ? "rotate-180" : "")}
          strokeWidth={1.75}
        />
      </button>
      {open ? (
        <ul className="flex flex-col divide-y divide-border border-t border-border">
          {listings.map((listing) => {
            const effectivePrice = listing.discountPrice ?? listing.price;
            return (
              <li key={listing.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <div className="space-y-0.5">
                  <p className="text-charcoal">{listing.sellerName}</p>
                  <p className="font-medium text-rose-700">
                    {effectivePrice.toLocaleString("fa-IR")} تومان
                  </p>
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
      ) : null}
    </div>
  );
}
