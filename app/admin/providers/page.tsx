import type { Metadata } from "next";
import Link from "next/link";
import { Printer } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { getServiceProviderProfiles } from "@/lib/data/admin";
import { cn } from "@/lib/cn";
import type { ApprovalStatus } from "@/lib/generated/prisma/client";

export const metadata: Metadata = {
  title: "پارتنرهای تولید",
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

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminProvidersPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const filterStatus: ApprovalStatus =
    status === "APPROVED" || status === "REJECTED" ? status : "PENDING";
  const providers = await getServiceProviderProfiles(filterStatus);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title="پارتنرهای تولید" />

      <div className="flex gap-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/providers?status=${tab.value}`}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              filterStatus === tab.value
                ? "border-gold-500 bg-gold-100 text-charcoal"
                : "border-border bg-surface text-charcoal-muted hover:border-rose-300",
            )}
          >
            {tab.label}
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
            return (
              <li key={provider.id}>
                <Link
                  href={`/admin/providers/${provider.id}`}
                  className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4 text-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-charcoal">{provider.businessName}</p>
                    {provider.isVerifiedByViora ? (
                      <span className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-medium text-gold-600">
                        تاییدیه‌ی ویژه
                      </span>
                    ) : null}
                  </div>
                  <p className="text-charcoal-muted">
                    {offering
                      ? [offering.supportsChrome && "کروم", offering.supportsMatte && "مات"]
                          .filter(Boolean)
                          .join("، ") || "بدون تنظیمات چاپ"
                      : "بدون تنظیمات چاپ"}
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
