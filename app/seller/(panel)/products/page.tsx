import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search, Package } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { getSellerProfile } from "@/lib/auth/seller";
import { getSellerProducts } from "@/lib/data/seller";
import { toNumber } from "@/lib/decimal";

export const metadata: Metadata = {
  title: "محصولات من",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ q?: string; status?: string }> };

export default async function SellerProductsPage({ searchParams }: Props) {
  const { q, status } = await searchParams;
  // Never null here: the (panel) layout already redirected/blocked every other case before
  // rendering this page.
  const profile = (await getSellerProfile())!;
  const products = await getSellerProducts(profile.id, {
    q: q || undefined,
    status: status === "active" || status === "inactive" ? status : undefined,
  });

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title="محصولات من" />

      <Link
        href="/seller/products/new"
        className="flex items-center justify-center gap-2 rounded-full bg-gold-500 py-3 text-sm font-medium text-charcoal hover:bg-gold-600"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        افزودن محصول جدید
      </Link>

      <form className="flex gap-2" method="get">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted"
            strokeWidth={1.75}
          />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="جستجوی نام محصول…"
            className="w-full rounded-2xl border border-border bg-surface py-2.5 pr-9 pl-3 text-sm text-charcoal focus:border-rose-400 focus:outline-none"
          />
        </div>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-2xl border border-border bg-surface px-3 text-sm text-charcoal focus:border-rose-400 focus:outline-none"
        >
          <option value="">همه</option>
          <option value="active">فعال</option>
          <option value="inactive">غیرفعال</option>
        </select>
      </form>

      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
          <Package className="h-6 w-6 text-charcoal-muted" strokeWidth={1.5} />
          <p className="text-sm text-charcoal-muted">محصولی یافت نشد.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {products.map((product) => (
            <li key={product.id}>
              <Link
                href={`/seller/products/${product.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 text-sm hover:shadow-md"
              >
                <div className="space-y-1">
                  <p className="font-medium text-charcoal">{product.title}</p>
                  <p className="text-charcoal-muted">
                    {product.category.name} · {product.city.name}
                  </p>
                  <p className="font-medium text-rose-700">
                    {toNumber(product.price).toLocaleString("fa-IR")} تومان
                  </p>
                </div>
                <span
                  className={
                    product.isActive
                      ? "shrink-0 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700"
                      : "shrink-0 rounded-full bg-border px-3 py-1 text-xs font-medium text-charcoal-muted"
                  }
                >
                  {product.isActive ? "فعال" : "غیرفعال"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
