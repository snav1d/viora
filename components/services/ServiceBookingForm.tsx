"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { JalaliDatePicker } from "@/components/ui/JalaliDatePicker";
import { CouponInput } from "@/components/checkout/CouponInput";
import { normalizeIranianContactNumber } from "@/lib/validation/phone";

const inputClass =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-charcoal focus:border-rose-400 focus:outline-none";

function todayPlus(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/// Booking details for one already-chosen ServiceOffering (docs/decisions.md ADR 44) - the
/// customer picked the partner and the specific offering on the profile page before reaching
/// here, so this only collects event logistics, same fields PrintOrderFlow's confirm step and
/// ADR 43's original SimpleServiceOrderFlow both used.
export function ServiceBookingForm({
  categorySlug,
  offeringId,
  price,
  defaultContactPhone,
}: {
  categorySlug: string;
  offeringId: string;
  price: number;
  /// Prefilled from the logged-in account's own phone, but always editable - the person
  /// coordinating the event may not be the one who booked it (docs/decisions.md ADR 45).
  defaultContactPhone: string;
}) {
  const router = useRouter();
  const [eventDate, setEventDate] = useState(todayPlus(3));
  const [address, setAddress] = useState("");
  const [contactPhone, setContactPhone] = useState(defaultContactPhone);
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = price - discountAmount;
  const isValid =
    eventDate.length > 0 &&
    address.trim().length >= 5 &&
    normalizeIranianContactNumber(contactPhone) !== null;

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/service-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categorySlug,
          offeringId,
          eventDate,
          address,
          contactPhone,
          notes: notes || undefined,
          couponCode: couponCode ?? undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }
      router.push("/profile");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-5 px-6 pb-6 pt-2">
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-charcoal">تاریخ رویداد</p>
        <JalaliDatePicker value={eventDate} onChange={setEventDate} minIso={todayPlus(1)} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="address" className="text-sm font-medium text-charcoal">
          آدرس محل برگزاری
        </label>
        <textarea
          id="address"
          rows={3}
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="contactPhone" className="text-sm font-medium text-charcoal">
          شماره تماس برای هماهنگی
        </label>
        <input
          id="contactPhone"
          type="tel"
          dir="ltr"
          value={contactPhone}
          onChange={(event) => setContactPhone(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="notes" className="text-sm font-medium text-charcoal">
          توضیحات (اختیاری)
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-charcoal">کد تخفیف</p>
        <CouponInput
          subtotal={price}
          appliedCode={couponCode}
          onApplied={(code, amount) => {
            setCouponCode(code);
            setDiscountAmount(amount);
          }}
          onRemoved={() => {
            setCouponCode(null);
            setDiscountAmount(0);
          }}
        />
      </div>

      <dl className="rounded-2xl border border-border bg-surface p-4 text-sm">
        {discountAmount > 0 ? (
          <div className="border-b border-border pb-3">
            <dt className="text-charcoal-muted">تخفیف</dt>
            <dd className="font-medium text-rose-700">-{discountAmount.toLocaleString("fa-IR")} تومان</dd>
          </div>
        ) : null}
        <div className="pt-3">
          <dt className="text-charcoal-muted">جمع کل</dt>
          <dd className="text-base font-semibold text-charcoal">{total.toLocaleString("fa-IR")} تومان</dd>
        </div>
      </dl>

      {error ? <p className="text-center text-sm text-rose-700">{error}</p> : null}

      <div className="mt-auto">
        <Button size="lg" className="w-full" disabled={!isValid || submitting} onClick={submit}>
          {submitting ? "در حال ثبت…" : "ثبت سفارش و پرداخت"}
        </Button>
      </div>
    </div>
  );
}
