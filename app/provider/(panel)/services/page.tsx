import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Boxes } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { getServiceProviderProfile } from "@/lib/auth/provider";
import { getMyServiceOfferings } from "@/lib/data/provider";
import { toNumber } from "@/lib/decimal";
import { PRINT_CATEGORY_SLUG } from "@/lib/serviceCategories";

export const metadata: Metadata = {
  title: "خدمات من",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Print-only providers keep their single offering at /provider/offering instead (docs/
// decisions.md ADR 44) - mirrors that page's own reverse redirect.
export default async function ProviderServicesPage() {
  // Never null here: the (panel) layout already redirected/blocked every other case before
  // rendering this page.
  const profile = (await getServiceProviderProfile())!;
  if (profile.category.slug === PRINT_CATEGORY_SLUG) {
    redirect("/provider/offering");
  }
  const offerings = await getMyServiceOfferings(profile.id);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title="خدمات من" />

      <Link
        href="/provider/services/new"
        className="flex items-center justify-center gap-2 rounded-full bg-charcoal py-3 text-sm font-medium text-warm-white hover:bg-charcoal/90"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        افزودن خدمت جدید
      </Link>

      {offerings.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
          <Boxes className="h-6 w-6 text-charcoal-muted" strokeWidth={1.5} />
          <p className="text-sm text-charcoal-muted">هنوز خدمتی اضافه نکرده‌اید.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {offerings.map((offering) => (
            <li key={offering.id}>
              <Link
                href={`/provider/services/${offering.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 text-sm transition-colors hover:border-charcoal/25"
              >
                <div className="space-y-1">
                  <p className="font-medium text-charcoal">{offering.title}</p>
                  <p className="font-medium text-charcoal">
                    {toNumber(offering.basePrice).toLocaleString("fa-IR")} تومان
                  </p>
                </div>
                <span
                  className={
                    offering.isActive
                      ? "shrink-0 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700"
                      : "shrink-0 rounded-full bg-border px-3 py-1 text-xs font-medium text-charcoal-muted"
                  }
                >
                  {offering.isActive ? "فعال" : "غیرفعال"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
