import type { Metadata } from "next";
import { Package, ClipboardList, Headset } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { getSellerProfile } from "@/lib/auth/seller";
import { getSellerStats } from "@/lib/data/seller";

export const metadata: Metadata = {
  title: "پنل فروشنده",
  robots: { index: false, follow: false },
};

export default async function SellerDashboardPage() {
  // Never null here: the (panel) layout already redirected/blocked every other case before
  // rendering this page.
  const profile = (await getSellerProfile())!;
  const stats = await getSellerStats(profile.id);

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-5">
      <TopBar title="پنل فروشنده" />

      <section className="rounded-2xl border border-border bg-surface p-4">
        <p className="font-medium text-charcoal">{profile.businessName}</p>
        <p className="mt-1 text-sm text-charcoal-muted">فروشگاه شما فعال است.</p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-semibold text-charcoal">
            {stats.activeProducts.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs text-charcoal-muted">محصول فعال</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-semibold text-charcoal">
            {stats.pendingItems.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs text-charcoal-muted">سفارش در انتظار ارسال</p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        {profile.status === "APPROVED" ? (
          <ButtonLink href="/seller/products/new" size="lg" className="w-full gap-2">
            <Package className="h-4 w-4" strokeWidth={1.75} />
            افزودن محصول جدید
          </ButtonLink>
        ) : null}
        <ButtonLink href="/seller/orders" variant="secondary" size="lg" className="w-full gap-2">
          <ClipboardList className="h-4 w-4" strokeWidth={1.75} />
          مشاهده سفارش‌ها
        </ButtonLink>
        <ButtonLink href="/support" variant="secondary" size="lg" className="w-full gap-2">
          <Headset className="h-4 w-4" strokeWidth={1.75} />
          تماس با پشتیبانی
        </ButtonLink>
      </section>
    </main>
  );
}
