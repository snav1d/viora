import type { Metadata } from "next";
import Link from "next/link";
import {
  UserCheck,
  Printer,
  Settings2,
  Headset,
  Ticket,
  Palette,
  Image as ImageIcon,
  Boxes,
  PackageSearch,
  MessageSquareWarning,
} from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { getAdminStats } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "پنل ادمین",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-5">
      <TopBar title="پنل ادمین" />

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-semibold text-charcoal">
            {stats.pendingSellers.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs text-charcoal-muted">فروشنده در انتظار</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-semibold text-charcoal">
            {stats.pendingProviders.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs text-charcoal-muted">پارتنر در انتظار</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-semibold text-charcoal">
            {stats.openTickets.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs text-charcoal-muted">تیکت باز</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-semibold text-charcoal">
            {stats.activeCities.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs text-charcoal-muted">شهر فعال</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-semibold text-charcoal">
            {stats.activeCategories.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs text-charcoal-muted">دسته‌بندی فعال</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-semibold text-charcoal">
            {stats.activeCoupons.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs text-charcoal-muted">کد تخفیف فعال</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-semibold text-charcoal">{stats.liveThemeName ?? "—"}</p>
          <p className="mt-1 text-xs text-charcoal-muted">تم فصلی فعال امروز</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-semibold text-charcoal">
            {stats.hubItems.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs text-charcoal-muted">آیتم در مرکز پردازش</p>
        </div>
        <Link
          href="/admin/tickets?type=RETURN_REQUEST"
          className="rounded-2xl border border-border bg-surface p-4 text-center hover:border-rose-300"
        >
          <p className="text-2xl font-semibold text-charcoal">
            {stats.pendingReturns.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs text-charcoal-muted">درخواست مرجوعی در انتظار</p>
        </Link>
        <Link
          href="/admin/products"
          className="rounded-2xl border border-border bg-surface p-4 text-center hover:border-rose-300"
        >
          <p className="text-2xl font-semibold text-charcoal">
            {stats.pendingProducts.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs text-charcoal-muted">محصول در انتظار بررسی</p>
        </Link>
        <Link
          href="/admin/reviews"
          className="rounded-2xl border border-border bg-surface p-4 text-center hover:border-rose-300"
        >
          <p className="text-2xl font-semibold text-charcoal">
            {stats.pendingReviews.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs text-charcoal-muted">نظر در انتظار تایید</p>
        </Link>
      </section>

      <section className="flex flex-col gap-3">
        <ButtonLink href="/admin/sellers" size="lg" className="w-full gap-2">
          <UserCheck className="h-4 w-4" strokeWidth={1.75} />
          تایید فروشنده‌ها
        </ButtonLink>
        <ButtonLink href="/admin/providers" variant="secondary" size="lg" className="w-full gap-2">
          <Printer className="h-4 w-4" strokeWidth={1.75} />
          تایید پارتنرهای تولید
        </ButtonLink>
        <ButtonLink href="/admin/tickets" variant="secondary" size="lg" className="w-full gap-2">
          <Headset className="h-4 w-4" strokeWidth={1.75} />
          تیکت‌های پشتیبانی
        </ButtonLink>
        <ButtonLink href="/admin/coupons" variant="secondary" size="lg" className="w-full gap-2">
          <Ticket className="h-4 w-4" strokeWidth={1.75} />
          کدهای تخفیف
        </ButtonLink>
        <ButtonLink href="/admin/hub" variant="secondary" size="lg" className="w-full gap-2">
          <Boxes className="h-4 w-4" strokeWidth={1.75} />
          مرکز پردازش ویورا
        </ButtonLink>
        <ButtonLink href="/admin/products" variant="secondary" size="lg" className="w-full gap-2">
          <PackageSearch className="h-4 w-4" strokeWidth={1.75} />
          بررسی محصولات جدید
        </ButtonLink>
        <ButtonLink href="/admin/reviews" variant="secondary" size="lg" className="w-full gap-2">
          <MessageSquareWarning className="h-4 w-4" strokeWidth={1.75} />
          نظرات در انتظار تایید
        </ButtonLink>
        <ButtonLink href="/admin/themes" variant="secondary" size="lg" className="w-full gap-2">
          <Palette className="h-4 w-4" strokeWidth={1.75} />
          تم فصلی/مناسبتی
        </ButtonLink>
        <ButtonLink href="/admin/banners" variant="secondary" size="lg" className="w-full gap-2">
          <ImageIcon className="h-4 w-4" strokeWidth={1.75} />
          مدیریت بنر
        </ButtonLink>
        <ButtonLink href="/admin/catalog" variant="secondary" size="lg" className="w-full gap-2">
          <Settings2 className="h-4 w-4" strokeWidth={1.75} />
          مدیریت شهر و دسته‌بندی
        </ButtonLink>
      </section>
    </main>
  );
}
