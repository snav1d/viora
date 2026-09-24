"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { OptionalJalaliDatePicker } from "@/components/ui/OptionalJalaliDatePicker";
import { cn } from "@/lib/cn";

const inputClass =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-charcoal focus:border-charcoal focus:outline-none";

function digitsOnly(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d]/g, "");
}

type CouponFormType = "PERCENTAGE" | "FIXED_AMOUNT";

export function CouponForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [type, setType] = useState<CouponFormType>("PERCENTAGE");
  const [value, setValue] = useState("");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [maxRedemptionsPerUser, setMaxRedemptionsPerUser] = useState("");
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          type,
          value: Number(value || "0"),
          maxDiscountAmount: type === "PERCENTAGE" && maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
          minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
          maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
          maxRedemptionsPerUser: maxRedemptionsPerUser ? Number(maxRedemptionsPerUser) : undefined,
          startsAt: startsAt ?? undefined,
          endsAt: endsAt ?? undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }
      router.push("/admin/coupons");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-6 py-6">
      <div className="space-y-1.5">
        <label htmlFor="code" className="text-sm font-medium text-charcoal">
          کد تخفیف
        </label>
        <input
          id="code"
          type="text"
          dir="ltr"
          required
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-charcoal">نوع تخفیف</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("PERCENTAGE")}
            className={cn(
              "flex-1 rounded-2xl border px-4 py-3 text-sm transition-colors",
              type === "PERCENTAGE"
                ? "border-charcoal bg-charcoal/5 text-charcoal"
                : "border-border bg-surface text-charcoal-muted",
            )}
          >
            درصدی
          </button>
          <button
            type="button"
            onClick={() => setType("FIXED_AMOUNT")}
            className={cn(
              "flex-1 rounded-2xl border px-4 py-3 text-sm transition-colors",
              type === "FIXED_AMOUNT"
                ? "border-charcoal bg-charcoal/5 text-charcoal"
                : "border-border bg-surface text-charcoal-muted",
            )}
          >
            مبلغ ثابت
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="value" className="text-sm font-medium text-charcoal">
          {type === "PERCENTAGE" ? "درصد تخفیف" : "مبلغ تخفیف (تومان)"}
        </label>
        <input
          id="value"
          type="text"
          inputMode="numeric"
          dir="ltr"
          required
          value={value}
          onChange={(event) => setValue(digitsOnly(event.target.value))}
          className={inputClass}
        />
      </div>

      {type === "PERCENTAGE" ? (
        <div className="space-y-1.5">
          <label htmlFor="maxDiscountAmount" className="text-sm font-medium text-charcoal">
            سقف تخفیف (تومان، اختیاری)
          </label>
          <input
            id="maxDiscountAmount"
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={maxDiscountAmount}
            onChange={(event) => setMaxDiscountAmount(digitsOnly(event.target.value))}
            className={inputClass}
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="minOrderAmount" className="text-sm font-medium text-charcoal">
          حداقل مبلغ سفارش (تومان، اختیاری)
        </label>
        <input
          id="minOrderAmount"
          type="text"
          inputMode="numeric"
          dir="ltr"
          value={minOrderAmount}
          onChange={(event) => setMinOrderAmount(digitsOnly(event.target.value))}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="maxRedemptions" className="text-sm font-medium text-charcoal">
            سقف تعداد کل (اختیاری)
          </label>
          <input
            id="maxRedemptions"
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={maxRedemptions}
            onChange={(event) => setMaxRedemptions(digitsOnly(event.target.value))}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="maxRedemptionsPerUser" className="text-sm font-medium text-charcoal">
            سقف به‌ازای هر کاربر (اختیاری)
          </label>
          <input
            id="maxRedemptionsPerUser"
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={maxRedemptionsPerUser}
            onChange={(event) => setMaxRedemptionsPerUser(digitsOnly(event.target.value))}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-charcoal">تاریخ شروع (اختیاری)</p>
        <OptionalJalaliDatePicker label="افزودن تاریخ شروع" value={startsAt} onChange={setStartsAt} />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-charcoal">تاریخ پایان (اختیاری)</p>
        <OptionalJalaliDatePicker label="افزودن تاریخ پایان" value={endsAt} onChange={setEndsAt} />
      </div>

      {error ? <p className="text-sm text-error-500">{error}</p> : null}

      <Button type="submit" size="lg" disabled={submitting} className="mt-2 w-full">
        {submitting ? "در حال ذخیره…" : "افزودن کد تخفیف"}
      </Button>
    </form>
  );
}
