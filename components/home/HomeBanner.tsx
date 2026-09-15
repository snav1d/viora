/// The one admin-managed banner live right now for the "بالای صفحه‌ی اصلی" slot
/// (docs/decisions.md ADR 36) - null renders nothing, same as any other optional home section.
export function HomeBanner({
  imageUrl,
  text,
  link,
}: {
  imageUrl: string;
  text: string;
  link: string | null;
}) {
  const content = (
    <div className="relative overflow-hidden rounded-3xl">
      {/* eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URLs, not a local /public asset next/image can optimize */}
      <img src={imageUrl} alt={text} className="h-32 w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/70 to-transparent p-3">
        <p className="text-sm font-medium text-warm-white">{text}</p>
      </div>
    </div>
  );

  if (link) {
    return <a href={link}>{content}</a>;
  }
  return content;
}
