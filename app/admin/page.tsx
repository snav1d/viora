import type { Metadata } from "next";
import { UserCheck, Printer, Settings2, Headset } from "lucide-react";
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
        <ButtonLink href="/admin/catalog" variant="secondary" size="lg" className="w-full gap-2">
          <Settings2 className="h-4 w-4" strokeWidth={1.75} />
          مدیریت شهر و دسته‌بندی
        </ButtonLink>
      </section>
    </main>
  );
}
