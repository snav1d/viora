import Link from "next/link";
import { PartyPopper, Printer, Camera, Sparkle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "promotional-balloon-printing": Printer,
  "balloon-decor-service": PartyPopper,
  photography: Camera,
};

/// /services' own category grid (docs/decisions.md ADR 45) - bigger, more visual cards than the
/// product shop's CategoryGrid (a large gradient icon tile instead of a small circle), since this
/// page's whole point is to feel like a browsable destination in its own right, not a compact
/// utility list.
export function ServiceCategoryGrid({
  categories,
}: {
  categories: { slug: string; name: string; href: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {categories.map((category) => {
        const Icon = ICONS[category.slug] ?? Sparkle;
        return (
          <Link
            key={category.slug}
            href={category.href}
            className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-surface py-6 text-center transition-shadow hover:shadow-md"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-gold-100 text-rose-600">
              <Icon className="h-7 w-7" strokeWidth={1.5} />
            </span>
            <span className="px-2 text-sm font-medium text-charcoal">{category.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
