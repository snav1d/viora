import Link from "next/link";
import { ProductPlaceholder } from "@/components/shop/ProductCard";

type CategoryTile = { slug: string; name: string; sampleImage: string | null };

/// docs/design-system.md §7-الف: /shop's own category grid, replacing the old 3-column
/// small-icon list with large photo-forward tiles - same visual contract as ProductCard's own
/// image card (4:5, rounded-2xl, no shadow), just carrying a category's representative product
/// photo instead of a lucide icon, with the name overlaid on a gradient like HomeHero/HomeBanner.
export function CategoryTileGrid({ categories }: { categories: CategoryTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/shop/${category.slug}`}
          className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border transition-colors hover:border-charcoal/25"
        >
          {category.sampleImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URL, not a local /public asset next/image can optimize
            <img src={category.sampleImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <ProductPlaceholder className="h-full w-full" />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/75 to-transparent p-3">
            <p className="text-sm font-medium text-warm-white">{category.name}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
