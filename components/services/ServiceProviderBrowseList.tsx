import Link from "next/link";
import { BadgeCheck } from "lucide-react";

type BrowsableProvider = {
  providerId: string;
  businessName: string;
  isVerifiedByViora: boolean;
  portfolioImages: string[];
};

/// Snapp Food-style vertical partner list (docs/decisions.md ADR 44 items 5, 6) - shared by both
/// print's own partner-first browse page and every "simple" category's browse page, since the
/// card itself looks identical either way; only where a card links to differs (a "simple"
/// category's own profile+offerings page vs. print's pre-selected-partner order flow), so that's
/// the one thing left as a prop rather than hardcoded. A large portfolio hero image per card, with
/// a horizontally scrollable strip of thumbnails inside the same card that never fights the
/// page's own vertical scroll - a plain overflow-x-auto div nested inside an anchor works
/// natively for this (a drag scrolls the strip, a plain tap still navigates, exactly like a link
/// surrounding a horizontally-scrollable image carousel anywhere else on the web - no custom
/// gesture handling needed).
export function ServiceProviderBrowseList({
  providers,
  hrefFor,
}: {
  providers: BrowsableProvider[];
  hrefFor: (providerId: string) => string;
}) {
  if (providers.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-charcoal-muted">فعلاً پارتنری با این مشخصات پیدا نشد.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {providers.map((provider) => {
        const hero = provider.portfolioImages[0];
        return (
          <Link
            key={provider.providerId}
            href={hrefFor(provider.providerId)}
            className="flex flex-col overflow-hidden rounded-3xl border border-border bg-surface"
          >
            <div className="relative h-40 w-full bg-border">
              {hero ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URL, not a local /public asset
                <img src={hero} alt={provider.businessName} className="h-full w-full object-cover" />
              ) : null}
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-charcoal/80 to-transparent p-3">
                <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-warm-white bg-border">
                  {hero ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URL
                    <img src={hero} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-warm-white">{provider.businessName}</p>
                  {provider.isVerifiedByViora ? (
                    <span className="flex items-center gap-1 rounded-full bg-gold-100 px-2 py-0.5 text-xs font-medium text-gold-600">
                      <BadgeCheck className="h-3 w-3" strokeWidth={2} />
                      تاییدیه‌ی ویژه
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            {provider.portfolioImages.length > 1 ? (
              <div className="flex gap-1.5 overflow-x-auto p-2">
                {provider.portfolioImages.map((image) => (
                  // eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URL
                  <img key={image} src={image} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                ))}
              </div>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
