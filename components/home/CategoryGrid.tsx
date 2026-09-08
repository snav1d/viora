import Link from "next/link";
import { Gift, CakeSlice, UtensilsCrossed, PartyPopper, Shirt, Sparkle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "balloons-decor": PartyPopper,
  "disposable-tableware": UtensilsCrossed,
  "cake-sweets": CakeSlice,
  "guest-gifts": Gift,
  "costume-accessories": Shirt,
};

export function CategoryGrid({
  categories,
}: {
  categories: { slug: string; name: string }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {categories.map((category) => {
        const Icon = ICONS[category.slug] ?? Sparkle;
        return (
          <Link
            key={category.slug}
            href={`/shop/${category.slug}`}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface py-4 text-center transition-shadow hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="px-1 text-xs font-medium text-charcoal">{category.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
