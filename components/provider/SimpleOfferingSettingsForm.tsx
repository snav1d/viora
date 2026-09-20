"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { ServiceCustomFieldDef } from "@/lib/serviceCategories";

const inputClass =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-charcoal focus:border-rose-400 focus:outline-none";

function digitsOnly(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d]/g, "");
}

/// Lets an approved "simple" service provider (balloon-decor, photography, ...) change their own
/// flat package price and fixed attribute values anytime (docs/decisions.md ADR 43) - the same
/// fields their registration wizard originally asked for, now editable standalone.
export function SimpleOfferingSettingsForm({
  customFields,
  initialBasePrice,
  initialCustomFieldValues,
}: {
  customFields: ServiceCustomFieldDef[];
  initialBasePrice: number;
  initialCustomFieldValues: Record<string, number>;
}) {
  const router = useRouter();
  const [basePrice, setBasePrice] = useState(String(initialBasePrice));
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>(
    Object.fromEntries(customFields.map((field) => [field.key, String(initialCustomFieldValues[field.key] ?? "")])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isValid =
    /^\d+$/.test(basePrice) &&
    Number(basePrice) > 0 &&
    customFields.every((field) => /^\d+$/.test(customFieldValues[field.key] ?? "") && Number(customFieldValues[field.key]) > 0);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const response = await fetch("/api/provider/offering", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basePrice: Number(basePrice),
          customFieldValues: Object.fromEntries(
            customFields.map((field) => [field.key, Number(customFieldValues[field.key])]),
          ),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <label htmlFor="basePrice" className="text-sm font-medium text-charcoal">
          قیمت پکیج (تومان)
        </label>
        <input
          id="basePrice"
          type="text"
          inputMode="numeric"
          dir="ltr"
          value={basePrice ? Number(basePrice).toLocaleString("fa-IR") : ""}
          onChange={(event) => setBasePrice(digitsOnly(event.target.value))}
          className={inputClass}
        />
      </div>

      {customFields.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <label htmlFor={field.key} className="text-sm font-medium text-charcoal">
            {field.label}
          </label>
          <input
            id={field.key}
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={customFieldValues[field.key] ?? ""}
            onChange={(event) =>
              setCustomFieldValues((current) => ({ ...current, [field.key]: digitsOnly(event.target.value) }))
            }
            className={inputClass}
          />
        </div>
      ))}

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {saved ? <p className="text-sm text-gold-600">تغییرات ذخیره شد.</p> : null}

      <Button type="submit" size="lg" disabled={!isValid || submitting} className="w-full">
        {submitting ? "در حال ذخیره…" : "ذخیره‌ی تغییرات"}
      </Button>
    </form>
  );
}
