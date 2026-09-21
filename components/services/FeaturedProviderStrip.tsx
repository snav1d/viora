import Link from "next/link";

type FeaturedProvider = {
  providerId: string;
  businessName: string;
  categoryLabel: string;
  portfolioImages: string[];
  href: string;
};

/// A horizontal-scroll row of compact partner cards, shared by /services' own "پیشنهاد ویژه‌ی
/// ویورا" and "تازه‌های ویورا" sections (docs/decisions.md ADR 45) - unlike
/// ServiceProviderBrowseList's vertical per-category list, these span every SERVICE category at
/// once, so each card also shows which category it's from. Renders nothing when empty.
export function FeaturedProviderStrip({
  title,
  providers,
}: {
  title: string;
  providers: FeaturedProvider[];
}) {
  if (providers.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-charcoal">{title}</h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {providers.map((provider) => {
          const hero = provider.portfolioImages[0];
          return (
            <Link
              key={provider.providerId}
              href={provider.href}
              className="flex w-36 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <div className="h-24 w-full bg-border">
                {hero ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URL
                  <img src={hero} alt={provider.businessName} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="space-y-0.5 p-2">
                <p className="line-clamp-1 text-xs font-medium text-charcoal">{provider.businessName}</p>
                <p className="text-[11px] text-charcoal-muted">{provider.categoryLabel}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
