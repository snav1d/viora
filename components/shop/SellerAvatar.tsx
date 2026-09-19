/// Shared between the product page's main "فروشنده" card and OtherSellersList (docs/decisions.md
/// ADR 42) - a seller's avatarUrl is nullable only for a legacy pre-ADR-29 row (the registration
/// wizard has always required picking one since), so this still degrades to a plain placeholder
/// circle rather than assuming it's always set.
export function SellerAvatar({
  url,
  name,
  className = "h-8 w-8",
}: {
  url: string | null;
  name: string;
  className?: string;
}) {
  if (!url) {
    return <div className={`shrink-0 rounded-full bg-border ${className}`} aria-hidden />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static avatar or remote/S3 URL
    <img src={url} alt={name} className={`shrink-0 rounded-full object-cover ${className}`} />
  );
}
