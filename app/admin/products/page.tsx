import type { Metadata } from "next";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { getProductsByStatus } from "@/lib/data/admin";
import { PRODUCT_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/cn";
import type { ProductStatus } from "@/lib/generated/prisma/client";

export const metadata: Metadata = {
  title: "محصولات",
  robots: { index: false, follow: false },
};

// Product.status changes whenever this very panel approves/rejects/requests revision on one -
// must never be cached/frozen at build time, same reasoning as every other phase-toggle page.
export const dynamic = "force-dynamic";

const STATUS_TABS: { value: ProductStatus; label: string }[] = [
  { value: "PENDING_REVIEW", label: PRODUCT_STATUS_LABELS.PENDING_REVIEW },
  { value: "NEEDS_REVISION", label: PRODUCT_STATUS_LABELS.NEEDS_REVISION },
  { value: "APPROVED", label: PRODUCT_STATUS_LABELS.APPROVED },
  { value: "REJECTED", label: PRODUCT_STATUS_LABELS.REJECTED },
];

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminProductsPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const filterStatus: ProductStatus =
    status === "NEEDS_REVISION" || status === "APPROVED" || status === "REJECTED"
      ? status
      : "PENDING_REVIEW";
  const products = await getProductsByStatus(filterStatus);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title="محصولات" />

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/products?status=${tab.value}`}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              filterStatus === tab.value
                ? "border-charcoal bg-charcoal/5 text-charcoal"
                : "border-border bg-surface text-charcoal-muted hover:border-charcoal/25",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
          <PackageSearch className="h-6 w-6 text-charcoal-muted" strokeWidth={1.5} />
          <p className="text-sm text-charcoal-muted">محصولی در این وضعیت نیست.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {products.map((product) => (
            <li key={product.id}>
              <Link
                href={`/admin/products/${product.id}`}
                className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4 text-sm transition-colors hover:border-charcoal/25"
              >
                <p className="font-medium text-charcoal">{product.title}</p>
                <p className="text-charcoal-muted">
                  {product.category.name}
                  {product.code ? ` · ${product.code}` : ""}
                </p>
                <p className="text-xs text-charcoal-muted">
                  {product.submittedBySeller?.businessName ?? "—"} ·{" "}
                  {new Date(product.createdAt).toLocaleDateString("fa-IR")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
