"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ClaimListingForm } from "@/components/seller/ClaimListingForm";
import { ProductForm } from "@/components/seller/ProductForm";

type CatalogResult = { id: string; title: string; code: string | null; categoryName: string };

/// Step 1 of "افزودن محصول" (docs/decisions.md ADR 39): search the shared catalog first, to avoid
/// duplicate catalog entries for the same physical product. A match hands off to
/// ClaimListingForm (just this seller's own terms, live immediately); no match falls through to
/// the full unified ProductForm ("ساخت محصول جدید"), which goes to admin review.
export function AddProductFlow({
  cities,
  categories,
}: {
  cities: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<CatalogResult | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const response = await fetch(`/api/seller/catalog/search?q=${encodeURIComponent(query.trim())}`);
      const data = await response.json();
      setResults(response.ok ? (data.products as CatalogResult[]) : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
      setSearched(true);
    }
  }

  if (selected) {
    return <ClaimListingForm productId={selected.id} productTitle={selected.title} cities={cities} />;
  }

  if (creatingNew) {
    return (
      <ProductForm
        cities={cities}
        categories={categories}
        endpoint="/api/seller/products"
        method="POST"
        showCatalogFields
        showActiveToggle={false}
        submitLabel="ثبت و ارسال برای بررسی"
        redirectTo="/seller/products"
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-6 py-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted"
            strokeWidth={1.75}
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جستجوی نام محصول در کاتالوگ ویورا…"
            className="w-full rounded-2xl border border-border bg-surface py-3 pr-9 pl-3 text-sm text-charcoal focus:border-charcoal focus:outline-none"
          />
        </div>
        <Button type="submit" disabled={searching || query.trim().length < 2}>
          جستجو
        </Button>
      </form>

      {searching ? <p className="text-center text-sm text-charcoal-muted">در حال جستجو…</p> : null}

      {!searching && searched ? (
        results.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {results.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => setSelected(product)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 text-right text-sm transition-colors hover:border-charcoal/25"
                >
                  <div>
                    <p className="font-medium text-charcoal">{product.title}</p>
                    <p className="text-charcoal-muted">
                      {product.categoryName}
                      {product.code ? ` · ${product.code}` : ""}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-charcoal-muted">
            محصولی با این نام در کاتالوگ پیدا نشد.
          </p>
        )
      ) : null}

      <button
        type="button"
        onClick={() => setCreatingNew(true)}
        className="text-center text-sm font-medium text-rose-600 underline underline-offset-2"
      >
        محصول من در کاتالوگ نیست — ساخت محصول جدید
      </button>
    </div>
  );
}
