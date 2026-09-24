import Link from "next/link";
import { Gift, CakeSlice, UtensilsCrossed, PartyPopper, Shirt, Printer, Camera, Sparkle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "balloons-decor": PartyPopper,
  "disposable-tableware": UtensilsCrossed,
  "cake-sweets": CakeSlice,
  "guest-gifts": Gift,
  "costume-accessories": Shirt,
  "promotional-balloon-printing": Printer,
  "balloon-decor-service": PartyPopper,
  photography: Camera,
};

export function CategoryGrid({
  categories,
}: {
  /// href defaults to the product-shop route - service categories (docs/decisions.md ADR 44
  /// item 5) pass their own browse-page path explicitly.
  categories: { slug: string; name: string; href?: string }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {categories.map((category) => {
        const Icon = ICONS[category.slug] ?? Sparkle;
        return (
          <Link
            key={category.slug}
            href={category.href ?? `/shop/${category.slug}`}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface py-4 text-center transition-colors hover:border-charcoal/25"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <Icon className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <span className="px-1 text-xs font-medium text-charcoal">{category.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
