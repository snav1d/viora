import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { getServiceProviderProfile } from "@/lib/auth/provider";
import { getProviderStats } from "@/lib/data/provider";

export const metadata: Metadata = {
  title: "پنل پارتنر تولید",
  robots: { index: false, follow: false },
};

export default async function ProviderDashboardPage() {
  // Never null here: the (panel) layout already redirected/blocked every other case before
  // rendering this page.
  const profile = (await getServiceProviderProfile())!;
  const stats = await getProviderStats(profile.id);

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-5">
      <TopBar title="پنل پارتنر تولید" />

      <section className="rounded-2xl border border-border bg-surface p-4">
        <p className="font-medium text-charcoal">{profile.businessName}</p>
        <p className="mt-1 text-sm text-charcoal-muted">حساب شما فعال است.</p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-semibold text-charcoal">
            {stats.awaitingAcceptance.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs text-charcoal-muted">سفارش در انتظار پذیرش</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-semibold text-charcoal">
            {stats.inProgress.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs text-charcoal-muted">در حال آماده‌سازی</p>
        </div>
      </section>

      <ButtonLink href="/provider/orders" size="lg" className="w-full gap-2">
        <ClipboardList className="h-4 w-4" strokeWidth={1.75} />
        مشاهده سفارش‌ها
      </ButtonLink>
    </main>
  );
}
