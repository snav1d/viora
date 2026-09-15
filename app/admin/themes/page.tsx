import type { Metadata } from "next";
import Link from "next/link";
import { Palette, Plus, Pencil } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { ActiveToggle } from "@/components/admin/ActiveToggle";
import { ThemePreviewButton } from "@/components/admin/ThemePreviewButton";
import { getAllSeasonalThemes } from "@/lib/data/admin";
import { formatJalaliRange } from "@/lib/jalali";

export const metadata: Metadata = {
  title: "تم فصلی/مناسبتی",
  robots: { index: false, follow: false },
};

// A theme's date window/isActive decides what's live site-wide right now - must never be cached.
export const dynamic = "force-dynamic";

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function AdminThemesPage() {
  const themes = await getAllSeasonalThemes();
  const now = new Date();

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title="تم فصلی/مناسبتی" />

      <Link
        href="/admin/themes/new"
        className="flex items-center justify-center gap-2 rounded-full bg-gold-500 px-6 py-3.5 text-base font-medium text-charcoal hover:bg-gold-600"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        تم جدید
      </Link>

      {themes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
          <Palette className="h-6 w-6 text-charcoal-muted" strokeWidth={1.5} />
          <p className="text-sm text-charcoal-muted">هنوز تمی ثبت نشده است.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {themes.map((theme) => {
            const isLiveNow = theme.isActive && theme.startsAt <= now && theme.endsAt >= now;
            return (
              <li key={theme.id} className="rounded-2xl border border-border bg-surface p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-charcoal">{theme.name}</p>
                      {isLiveNow ? (
                        <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[10px] text-gold-600">
                          فعال امروز
                        </span>
                      ) : null}
                    </div>
                    <p className="text-charcoal-muted">
                      {formatJalaliRange(toIso(theme.startsAt), toIso(theme.endsAt))}
                    </p>
                  </div>
                  <ActiveToggle id={theme.id} isActive={theme.isActive} kind="themes" />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <ThemePreviewButton themeId={theme.id} />
                  <Link
                    href={`/admin/themes/${theme.id}/edit`}
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
