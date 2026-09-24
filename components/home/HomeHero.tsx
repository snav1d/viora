import Link from "next/link";
import { ImageOff } from "lucide-react";

type HeroCategory = { slug: string; name: string; href: string };

/// docs/design-system.md §7-الف: the page's own dominant first element - full-bleed, ~46vh tall,
/// with the category capsule tabs pinned on its bottom edge as plain navigation links (the exact
/// destinations CategoryGrid used to own, now shown here instead - CategoryGrid is retired from
/// /home entirely, not kept alongside this). Renders at the same size whether or not an admin has
/// set a HOME_HERO banner - an empty state that collapsed to nothing would break the "image is
/// always the first thing seen" structural promise this section exists to keep. Deliberately not
/// wrapped in a single <a>: the banner's own optional link and the category tabs are two
/// different clickable layers on the same image, and nesting an anchor inside an anchor is both
/// invalid HTML and unpredictable to click - so the image link (if any) and the tabs row are
/// siblings, stacked with z-index, not parent/child.
export function HomeHero({
  banner,
  categories,
}: {
  banner: { imageUrl: string; text: string; link: string | null } | null;
  categories: HeroCategory[];
}) {
  return (
    <div className="relative h-[46vh] max-h-[420px] min-h-[280px] w-full overflow-hidden">
      {banner ? (
        banner.link ? (
          <a href={banner.link} className="absolute inset-0 z-0 block">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URL, not a local /public asset next/image can optimize */}
            <img src={banner.imageUrl} alt={banner.text} className="h-full w-full object-cover" />
          </a>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URL
          <img
            src={banner.imageUrl}
            alt={banner.text}
            className="absolute inset-0 z-0 h-full w-full object-cover"
          />
        )
      ) : (
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-gradient-to-br from-rose-100 to-gold-100 text-rose-400">
          <ImageOff className="h-10 w-10" strokeWidth={1.5} />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-charcoal/75 via-charcoal/25 to-transparent pb-16 pt-16" />

      {banner?.text ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-16 z-10 px-4 pb-2 text-sm font-medium text-warm-white">
          {banner.text}
        </p>
      ) : null}

      {categories.length > 0 ? (
        <div className="absolute inset-x-0 bottom-4 z-20 flex gap-2 overflow-x-auto px-4">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={category.href}
              className="shrink-0 rounded-full bg-warm-white/95 px-4 py-2 text-sm font-medium text-charcoal backdrop-blur"
            >
              {category.name}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
