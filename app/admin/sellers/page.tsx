import type { Metadata } from "next";
import Link from "next/link";
import { UserCheck } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { getSellerProfiles } from "@/lib/data/admin";
import { cn } from "@/lib/cn";
import type { SellerStatus } from "@/lib/generated/prisma/client";

export const metadata: Metadata = {
  title: "فروشنده‌ها",
  robots: { index: false, follow: false },
};

// SellerProfile.status changes whenever this very panel approves/rejects/suspends one - must
// never be cached/frozen at build time, same reasoning as every other phase-toggle page in this
// app.
export const dynamic = "force-dynamic";

const STATUS_TABS: { value: SellerStatus; label: string }[] = [
  { value: "PENDING", label: "در انتظار" },
  { value: "APPROVED", label: "تایید‌شده" },
  { value: "REJECTED", label: "رد‌شده" },
  { value: "SUSPENDED", label: "تعلیق‌شده" },
];

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminSellersPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const filterStatus: SellerStatus =
    status === "APPROVED" || status === "REJECTED" || status === "SUSPENDED" ? status : "PENDING";
  const sellers = await getSellerProfiles(filterStatus);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title="فروشنده‌ها" />

      <div className="flex gap-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/sellers?status=${tab.value}`}
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

      {sellers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
          <UserCheck className="h-6 w-6 text-charcoal-muted" strokeWidth={1.5} />
          <p className="text-sm text-charcoal-muted">فروشنده‌ای در این وضعیت نیست.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {sellers.map((seller) => (
            <li key={seller.id}>
              <Link
                href={`/admin/sellers/${seller.id}`}
                className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4 text-sm hover:shadow-md"
              >
                <p className="font-medium text-charcoal">{seller.businessName}</p>
                <p className="text-charcoal-muted">
                  {seller.categories.map((c) => c.category.name).join("، ") || "بدون دسته‌بندی"}
                </p>
                <p className="text-xs text-charcoal-muted">
                  {seller.city?.name ?? "—"} ·{" "}
                  {new Date(seller.createdAt).toLocaleDateString("fa-IR")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
