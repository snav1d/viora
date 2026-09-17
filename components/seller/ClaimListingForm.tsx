"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const inputClass =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-charcoal focus:border-rose-400 focus:outline-none";

function toEnglishDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function digitsOnly(value: string): string {
  return toEnglishDigits(value).replace(/[^\d]/g, "");
}

/// Step 2 of "claim an existing catalog product" (docs/decisions.md ADR 39): the catalog entry is
/// already approved, so this only ever asks for this seller's own terms - no admin review, live
/// immediately on submit.
export function ClaimListingForm({
  productId,
  productTitle,
  cities,
}: {
  productId: string;
  productTitle: string;
  cities: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [cityId, setCityId] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/seller/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          cityId,
          price: Number(price || "0"),
          discountPrice: discountPrice ? Number(discountPrice) : null,
          stock: Number(stock || "0"),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }
      router.push("/seller/products");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-6 py-6">
      <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
        <p className="text-charcoal-muted">افزودن این محصول از کاتالوگ:</p>
        <p className="mt-1 font-medium text-charcoal">{productTitle}</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cityId" className="text-sm font-medium text-charcoal">
          شهر
        </label>
        <select
          id="cityId"
          required
          value={cityId}
          onChange={(event) => setCityId(event.target.value)}
          className={inputClass}
        >
          <option value="" disabled>
            انتخاب کنید…
          </option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="price" className="text-sm font-medium text-charcoal">
            قیمت (تومان)
          </label>
          <input
            id="price"
            type="text"
            inputMode="numeric"
            required
            value={price ? Number(price).toLocaleString("fa-IR") : ""}
            onChange={(event) => setPrice(digitsOnly(event.target.value))}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="stock" className="text-sm font-medium text-charcoal">
            موجودی
          </label>
          <input
            id="stock"
            type="text"
            inputMode="numeric"
            required
            value={stock ? Number(stock).toLocaleString("fa-IR") : ""}
            onChange={(event) => setStock(digitsOnly(event.target.value))}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="discountPrice" className="text-sm font-medium text-charcoal">
          قیمت با تخفیف (اختیاری)
        </label>
        <input
          id="discountPrice"
          type="text"
          inputMode="numeric"
          value={discountPrice ? Number(discountPrice).toLocaleString("fa-IR") : ""}
          onChange={(event) => setDiscountPrice(digitsOnly(event.target.value))}
          placeholder="خالی بگذارید تا بدون تخفیف باشد"
          className={inputClass}
        />
        {discountPrice && price && Number(discountPrice) >= Number(price) ? (
          <p className="text-xs text-rose-700">قیمت با تخفیف باید کمتر از قیمت اصلی باشد.</p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <Button
        type="submit"
        size="lg"
        disabled={
          submitting || (discountPrice !== "" && price !== "" && Number(discountPrice) >= Number(price))
        }
        className="mt-2 w-full"
      >
        {submitting ? "در حال ثبت…" : "افزودن به فروشگاه من"}
      </Button>
    </form>
  );
}
