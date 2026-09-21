/// HOME_PROMO_STRIP's own horizontal row (docs/decisions.md ADR 45) - unlike HomeBanner's one
/// large hero slot, several smaller banners sit side by side here, natively swipeable via
/// overflow-x-auto (same "a scrollable strip inside a click target just works" pattern already
/// proven by ServiceProviderBrowseList's portfolio thumbnails). Renders nothing when empty, same
/// as HomeBanner.
export function PromoStrip({
  banners,
}: {
  banners: { id: string; imageUrl: string; text: string; link: string | null }[];
}) {
  if (banners.length === 0) return null;

  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
      {banners.map((banner) => {
        const content = (
          <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URLs, not a local /public asset next/image can optimize */}
            <img src={banner.imageUrl} alt={banner.text} className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/70 to-transparent p-2">
              <p className="line-clamp-2 text-xs font-medium text-warm-white">{banner.text}</p>
            </div>
          </div>
        );
        return banner.link ? (
          <a key={banner.id} href={banner.link}>
            {content}
          </a>
        ) : (
          <div key={banner.id}>{content}</div>
        );
      })}
    </div>
  );
}
