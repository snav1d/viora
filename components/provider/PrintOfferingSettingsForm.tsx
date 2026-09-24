"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const inputClass =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-charcoal focus:border-charcoal focus:outline-none";

function digitsOnly(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d]/g, "");
}

type Tier = { minQuantity: string; maxQuantity: string; unitPrice: string };

/// Lets an approved print provider change their own چاپ settings (colors/finish/minimum
/// tیراژ/pricing tiers) anytime (docs/decisions.md ADR 43) - previously only settable once, at
/// registration, which the print wizard (components/provider/ProviderRegisterWizard.tsx) still
/// owns exclusively; this is a separate, standalone editing surface, not a change to that wizard.
export function PrintOfferingSettingsForm({
  colors,
  initialSupportsChrome,
  initialSupportsMatte,
  initialColors,
  initialMinOrderQuantity,
  initialTiers,
}: {
  colors: string[];
  initialSupportsChrome: boolean;
  initialSupportsMatte: boolean;
  initialColors: string[];
  initialMinOrderQuantity: number;
  initialTiers: Tier[];
}) {
  const router = useRouter();
  const [supportsChrome, setSupportsChrome] = useState(initialSupportsChrome);
  const [supportsMatte, setSupportsMatte] = useState(initialSupportsMatte);
  const [selectedColors, setSelectedColors] = useState<string[]>(initialColors);
  const [minOrderQuantity, setMinOrderQuantity] = useState(String(initialMinOrderQuantity));
  const [tiers, setTiers] = useState<Tier[]>(initialTiers);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggleColor(color: string) {
    setSelectedColors((current) =>
      current.includes(color) ? current.filter((c) => c !== color) : [...current, color],
    );
  }

  function updateTier(index: number, patch: Partial<Tier>) {
    setTiers((current) => current.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));
  }

  function addTier() {
    setTiers((current) => [...current, { minQuantity: "", maxQuantity: "", unitPrice: "" }]);
  }

  function removeTier(index: number) {
    setTiers((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
  }

  const quantityValid = /^\d+$/.test(minOrderQuantity) && Number(minOrderQuantity) > 0;
  const tiersValid =
    tiers.length > 0 &&
    tiers.every((tier) => {
      const min = Number(tier.minQuantity);
      const price = Number(tier.unitPrice);
      if (!tier.minQuantity || !(min > 0) || !tier.unitPrice || !(price > 0)) return false;
      if (tier.maxQuantity && !(Number(tier.maxQuantity) > min)) return false;
      return true;
    });
  const isValid = (supportsChrome || supportsMatte) && selectedColors.length >= 1 && quantityValid && tiersValid;

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
          supportsChrome,
          supportsMatte,
          printableColors: selectedColors,
          minOrderQuantity: Number(minOrderQuantity),
          pricingTiers: tiers.map((tier) => ({
            minQuantity: Number(tier.minQuantity),
            maxQuantity: tier.maxQuantity ? Number(tier.maxQuantity) : null,
            unitPrice: Number(tier.unitPrice),
          })),
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-charcoal">نوع بادکنک قابل‌چاپ</p>
        <div className="flex gap-2">
          <label
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm transition-colors",
              supportsChrome ? "border-gold-500 bg-gold-100 text-charcoal" : "border-border bg-surface text-charcoal-muted",
            )}
          >
            <input
              type="checkbox"
              checked={supportsChrome}
              onChange={(event) => setSupportsChrome(event.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            کروم
          </label>
          <label
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm transition-colors",
              supportsMatte ? "border-gold-500 bg-gold-100 text-charcoal" : "border-border bg-surface text-charcoal-muted",
            )}
          >
            <input
              type="checkbox"
              checked={supportsMatte}
              onChange={(event) => setSupportsMatte(event.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            مات
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-charcoal">رنگ‌های قابل‌چاپ</p>
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => {
            const checked = selectedColors.includes(color);
            return (
              <label
                key={color}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  checked ? "border-gold-500 bg-gold-100 text-charcoal" : "border-border bg-surface text-charcoal-muted",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleColor(color)}
                  className="h-3.5 w-3.5 rounded border-border"
                />
                {color}
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="minOrderQuantity" className="text-sm font-medium text-charcoal">
          حداقل تیراژ قابل‌قبول
        </label>
        <input
          id="minOrderQuantity"
          type="text"
          inputMode="numeric"
          dir="ltr"
          value={minOrderQuantity}
          onChange={(event) => setMinOrderQuantity(digitsOnly(event.target.value))}
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-charcoal">تعرفه‌ی پلکانی بر اساس تیراژ</p>
        <div className="flex flex-col gap-3">
          {tiers.map((tier, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-2xl border border-border p-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-charcoal-muted">از تیراژ</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    value={tier.minQuantity}
                    onChange={(event) => updateTier(index, { minQuantity: digitsOnly(event.target.value) })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-charcoal-muted">تا تیراژ (خالی = نامحدود)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    value={tier.maxQuantity}
                    onChange={(event) => updateTier(index, { maxQuantity: digitsOnly(event.target.value) })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-charcoal-muted">قیمت واحد (تومان)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  value={tier.unitPrice}
                  onChange={(event) => updateTier(index, { unitPrice: digitsOnly(event.target.value) })}
                  className={inputClass}
                />
              </div>
              {tiers.length > 1 ? (
                <button type="button" onClick={() => removeTier(index)} className="self-start text-xs text-rose-700">
                  حذف این بازه
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <button type="button" onClick={addTier} className="flex items-center gap-1.5 text-sm font-medium text-rose-700">
          <Plus className="h-4 w-4" strokeWidth={2} />
          افزودن بازه‌ی دیگر
        </button>
      </div>

      {error ? <p className="text-sm text-error-500">{error}</p> : null}
      {saved ? <p className="text-sm text-gold-600">تغییرات ذخیره شد.</p> : null}

      <Button type="submit" size="lg" disabled={!isValid || submitting} className="w-full">
        {submitting ? "در حال ذخیره…" : "ذخیره‌ی تغییرات"}
      </Button>
    </form>
  );
}
