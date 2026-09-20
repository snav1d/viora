import type { Metadata } from "next";
import Link from "next/link";
import { Printer } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { getServiceProviderProfiles, getAllCategories } from "@/lib/data/admin";
import { toNumber } from "@/lib/decimal";
import { cn } from "@/lib/cn";
import type { ApprovalStatus } from "@/lib/generated/prisma/client";
import { PRINT_CATEGORY_SLUG } from "@/lib/serviceCategories";

export const metadata: Metadata = {
  title: "پارتنرهای خدماتی",
  robots: { index: false, follow: false },
};

// ServiceProviderProfile.status changes whenever this very panel approves/rejects one - must
// never be cached/frozen at build time, same reasoning as the sellers queue (ADR 27).
export const dynamic = "force-dynamic";

const STATUS_TABS: { value: ApprovalStatus; label: string }[] = [
  { value: "PENDING", label: "در انتظار" },
  { value: "APPROVED", label: "تایید‌شده" },
  { value: "REJECTED", label: "رد‌شده" },
];

type Props = { searchParams: Promise<{ status?: string; category?: string }> };

export default async function AdminProvidersPage({ searchParams }: Props) {
  const { status, category } = await searchParams;
  const filterStatus: ApprovalStatus =
    status === "APPROVED" || status === "REJECTED" ? status : "PENDING";

  // One shared queue for every service category (docs/decisions.md ADR 43) - the category filter
  // tabs are built from whatever SERVICE categories actually exist, so a future new category
  // needs no change here.
  const allCategories = await getAllCategories();
  const serviceCategories = allCategories.filter((c) => c.type === "SERVICE");
  const filterCategory = serviceCategories.some((c) => c.slug === category) ? category : undefined;

  const providers = await getServiceProviderProfiles(filterStatus, filterCategory);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title="پارتنرهای خدماتی" />

      <div className="flex gap-2 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/providers?status=${tab.value}${filterCategory ? `&category=${filterCategory}` : ""}`}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm transition-colors",
              filterStatus === tab.value
                ? "border-gold-500 bg-gold-100 text-charcoal"
                : "border-border bg-surface text-charcoal-muted hover:border-rose-300",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <Link
          href={`/admin/providers?status=${filterStatus}`}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
            !filterCategory
              ? "border-rose-400 bg-rose-50 text-rose-700"
              : "border-border bg-surface text-charcoal-muted hover:border-rose-300",
          )}
        >
          همه‌ی دسته‌ها
        </Link>
        {serviceCategories.map((cat) => (
          <Link
            key={cat.id}
            href={`/admin/providers?status=${filterStatus}&category=${cat.slug}`}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
              filterCategory === cat.slug
                ? "border-rose-400 bg-rose-50 text-rose-700"
                : "border-border bg-surface text-charcoal-muted hover:border-rose-300",
            )}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {providers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
          <Printer className="h-6 w-6 text-charcoal-muted" strokeWidth={1.5} />
          <p className="text-sm text-charcoal-muted">پارتنری در این وضعیت نیست.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {providers.map((provider) => {
            const offering = provider.serviceOfferings[0];
            const isPrint = offering?.category.slug === PRINT_CATEGORY_SLUG;
            return (
              <li key={provider.id}>
                <Link
                  href={`/admin/providers/${provider.id}`}
                  className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4 text-sm hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-medium text-charcoal">{provider.businessName}</p>
                    {offering ? (
                      <span className="rounded-full border border-border bg-warm-white px-2 py-0.5 text-xs text-charcoal-muted">
                        {offering.category.name}
                      </span>
                    ) : null}
                    {provider.isVerifiedByViora ? (
                      <span className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-medium text-gold-600">
                        تاییدیه‌ی ویژه
                      </span>
                    ) : null}
                  </div>
                  <p className="text-charcoal-muted">
                    {!offering
                      ? "بدون پیشنهاد فعال"
                      : isPrint
                        ? [offering.supportsChrome && "کروم", offering.supportsMatte && "مات"]
                            .filter(Boolean)
                            .join("، ") || "بدون تنظیمات چاپ"
                        : `${toNumber(offering.basePrice).toLocaleString("fa-IR")} تومان`}
                  </p>
                  <p className="text-xs text-charcoal-muted">
                    {new Date(provider.createdAt).toLocaleDateString("fa-IR")}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
