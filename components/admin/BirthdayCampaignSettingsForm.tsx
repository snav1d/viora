"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { COUPON_TYPE_LABELS } from "@/lib/labels";
import type { CouponType } from "@/lib/generated/prisma/client";

const TYPE_OPTIONS: CouponType[] = ["PERCENTAGE", "FIXED_AMOUNT"];

/// Admin-editable settings for the birthday-discount campaign (docs/decisions.md ADR 45) - whole-
/// order only for now. Every future birthday coupon is issued using whatever's saved here at the
/// moment a customer claims theirs; existing coupons already issued keep whatever value they were
/// given at that moment (a Coupon is a snapshot, never re-read from live settings).
export function BirthdayCampaignSettingsForm({
  initialType,
  initialValue,
}: {
  initialType: CouponType;
  initialValue: number;
}) {
  const router = useRouter();
  const [type, setType] = useState<CouponType>(initialType);
  const [value, setValue] = useState(String(initialValue));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const response = await fetch("/api/admin/birthday-campaign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value: Number(value) }),
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
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
      <p className="font-medium text-charcoal">تنظیمات کد تخفیف تولد</p>
      <p className="text-xs text-charcoal-muted">
        هر کاربر با ثبت تاریخ تولد در پروفایلش، یک‌بار یک کد تخفیف اختصاصی طبق این تنظیمات
        دریافت می‌کند (فقط روی کل سفارش، نه یک محصول خاص).
      </p>
      <div className="flex items-center gap-2">
        <select
          value={type}
          onChange={(event) => setType(event.target.value as CouponType)}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-charcoal focus:border-rose-400 focus:outline-none"
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {COUPON_TYPE_LABELS[option]}
            </option>
          ))}
        </select>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-24 rounded-xl border border-border bg-surface px-3 py-2 text-charcoal focus:border-rose-400 focus:outline-none"
        />
        <span className="text-charcoal-muted">{type === "PERCENTAGE" ? "٪" : "تومان"}</span>
      </div>
      {error ? <p className="text-rose-700">{error}</p> : null}
      {saved ? <p className="text-emerald-700">ذخیره شد.</p> : null}
      <Button size="md" disabled={saving} onClick={handleSave} className="w-fit">
        {saving ? "در حال ذخیره…" : "ذخیره"}
      </Button>
    </div>
  );
}
