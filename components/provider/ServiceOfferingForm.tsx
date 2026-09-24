"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const inputClass =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-charcoal focus:border-charcoal focus:outline-none";

function digitsOnly(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d]/g, "");
}

/// Create/edit form for one of a "simple" category provider's own named ServiceOfferings (docs/
/// decisions.md ADR 44) - each is independently titled/described/priced, with no admin review;
/// `showActiveToggle` only applies to editing an existing one (a brand-new offering is always
/// created active).
export function ServiceOfferingForm({
  endpoint,
  method,
  initial,
  showActiveToggle,
  submitLabel,
  redirectTo,
}: {
  endpoint: string;
  method: "POST" | "PATCH";
  initial?: { title: string; description: string | null; price: number; isActive: boolean };
  showActiveToggle: boolean;
  submitLabel: string;
  redirectTo: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          price: Number(price || "0"),
          ...(showActiveToggle ? { isActive } : {}),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-6 py-6">
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium text-charcoal">
          عنوان خدمت
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={inputClass}
          placeholder="مثلاً: پکیج عکاسی ۴ ساعته"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium text-charcoal">
          توضیحات
        </label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="price" className="text-sm font-medium text-charcoal">
          قیمت (تومان)
        </label>
        <input
          id="price"
          type="text"
          inputMode="numeric"
          dir="ltr"
          required
          value={price ? Number(price).toLocaleString("fa-IR") : ""}
          onChange={(event) => setPrice(digitsOnly(event.target.value))}
          className={inputClass}
        />
      </div>

      {showActiveToggle ? (
        <label className="flex items-center gap-2 text-sm text-charcoal">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          نمایش برای مشتری (فعال)
        </label>
      ) : null}

      {error ? <p className="text-sm text-error-500">{error}</p> : null}

      <Button type="submit" size="lg" disabled={submitting} className="mt-2 w-full">
        {submitting ? "در حال ذخیره…" : submitLabel}
      </Button>
    </form>
  );
}
