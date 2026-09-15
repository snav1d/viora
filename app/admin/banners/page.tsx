import type { Metadata } from "next";
import Link from "next/link";
import { Image as ImageIcon, Plus, Pencil } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { ActiveToggle } from "@/components/admin/ActiveToggle";
import { getAllBanners } from "@/lib/data/admin";
import { BANNER_PLACEMENT_LABELS } from "@/lib/labels";
import { formatJalaliRange, formatJalaliLong } from "@/lib/jalali";

export const metadata: Metadata = {
  title: "مدیریت بنر",
  robots: { index: false, follow: false },
};

// A banner's date window/isActive decides what's live right now on the storefront - must never
// be cached.
export const dynamic = "force-dynamic";

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateRangeLabel(startsAt: Date | null, endsAt: Date | null): string {
  if (startsAt && endsAt) return formatJalaliRange(toIso(startsAt), toIso(endsAt));
  if (startsAt) return `از ${formatJalaliLong(toIso(startsAt))}`;
  if (endsAt) return `تا ${formatJalaliLong(toIso(endsAt))}`;
  return "بدون محدودیت تاریخ";
}

export default async function AdminBannersPage() {
  const banners = await getAllBanners();
  const now = new Date();

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title="مدیریت بنر" />

      <Link
        href="/admin/banners/new"
        className="flex items-center justify-center gap-2 rounded-full bg-gold-500 px-6 py-3.5 text-base font-medium text-charcoal hover:bg-gold-600"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        بنر جدید
      </Link>

      {banners.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
          <ImageIcon className="h-6 w-6 text-charcoal-muted" strokeWidth={1.5} />
          <p className="text-sm text-charcoal-muted">هنوز بنری ثبت نشده است.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {banners.map((banner) => {
            const isLiveNow =
              banner.isActive &&
              (!banner.startsAt || banner.startsAt <= now) &&
              (!banner.endsAt || banner.endsAt >= now);
            return (
              <li key={banner.id} className="rounded-2xl border border-border bg-surface p-4 text-sm">
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URLs, not a local /public asset next/image can optimize */}
                  <img
                    src={banner.imageUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-charcoal">{banner.text}</p>
                      {isLiveNow ? (
                        <span className="shrink-0 rounded-full bg-gold-100 px-2 py-0.5 text-[10px] text-gold-600">
                          فعال امروز
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-charcoal-muted">{BANNER_PLACEMENT_LABELS[banner.placement]}</p>
                    <p className="text-xs text-charcoal-muted">
                      {dateRangeLabel(banner.startsAt, banner.endsAt)}
                    </p>
                  </div>
                  <ActiveToggle id={banner.id} isActive={banner.isActive} kind="banners" />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href={`/admin/banners/${banner.id}/edit`}
                    className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-charcoal-muted hover:bg-rose-50"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                    ویرایش
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
