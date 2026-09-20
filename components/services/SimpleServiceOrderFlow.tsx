"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, BadgeCheck, Images } from "lucide-react";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { Button } from "@/components/ui/Button";
import { JalaliDatePicker } from "@/components/ui/JalaliDatePicker";
import { CouponInput } from "@/components/checkout/CouponInput";
import { PortfolioGalleryModal } from "@/components/ui/PortfolioGalleryModal";
import type { ServiceCustomFieldDef } from "@/lib/serviceCategories";
import type { SimpleServiceListing } from "@/lib/data/services";

const TOTAL_STEPS = 2;

const inputClass =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-charcoal focus:border-rose-400 focus:outline-none";

function todayPlus(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function StepShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <h1 className="text-center text-lg font-semibold text-charcoal">{title}</h1>
      {children}
    </div>
  );
}

/// Booking flow for a "simple" service category (docs/decisions.md ADR 43) - unlike
/// PrintOrderFlow, there's no per-order customization step: the customer picks a partner's
/// already-fixed flat package (Option A) and only supplies event logistics (date/address/notes).
export function SimpleServiceOrderFlow({
  categorySlug,
  categoryLabel,
  customFields,
  listings,
}: {
  categorySlug: string;
  categoryLabel: string;
  customFields: ServiceCustomFieldDef[];
  listings: SimpleServiceListing[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null);
  const [galleryListing, setGalleryListing] = useState<SimpleServiceListing | null>(null);
  const [eventDate, setEventDate] = useState(todayPlus(3));
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedListing = listings.find((listing) => listing.offeringId === selectedOfferingId) ?? null;
  const subtotal = selectedListing?.basePrice ?? 0;
  const total = subtotal - discountAmount;
  const isStep2Valid = eventDate.length > 0 && address.trim().length >= 5;

  function selectListing(offeringId: string) {
    setSelectedOfferingId(offeringId);
    setStep(2);
  }

  function goBack() {
    setError(null);
    if (step === 1) {
      router.push("/home");
      return;
    }
    setStep((s) => s - 1);
  }

  async function submitOrder() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/service-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categorySlug,
          offeringId: selectedOfferingId,
          eventDate,
          address,
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
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={goBack}
          aria-label="بازگشت"
          className="flex h-9 w-9 items-center justify-center rounded-full text-charcoal-muted hover:bg-rose-50"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <ProgressDots total={TOTAL_STEPS} current={step} />
        </div>
        <div className="w-9" />
      </div>

      <div className="flex flex-1 flex-col gap-6 px-6 pb-6 pt-2">
        {step === 1 && (
          <StepShell title={`پارتنرهای ${categoryLabel}`}>
            {listings.length === 0 ? (
              <p className="py-10 text-center text-sm text-charcoal-muted">
                فعلاً پارتنری با این مشخصات پیدا نشد.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {listings.map((listing) => (
                  <div
                    key={listing.offeringId}
                    className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm hover:border-rose-300"
                  >
                    <button
                      type="button"
                      onClick={() => selectListing(listing.offeringId)}
                      className="flex flex-col gap-1 text-right"
                    >
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-charcoal">{listing.businessName}</p>
                        {listing.isVerifiedByViora ? (
                          <span className="flex items-center gap-1 rounded-full bg-gold-100 px-2 py-0.5 text-xs font-medium text-gold-600">
                            <BadgeCheck className="h-3 w-3" strokeWidth={2} />
                            تاییدیه‌ی ویژه
                          </span>
                        ) : null}
                      </div>
                      {customFields.length > 0 ? (
                        <p className="text-xs text-charcoal-muted">
                          {customFields
                            .map(
                              (field) =>
                                `${field.label}: ${(listing.customFieldValues[field.key] ?? 0).toLocaleString("fa-IR")}`,
                            )
                            .join(" · ")}
                        </p>
                      ) : null}
                      <p className="font-semibold text-rose-700">
                        {listing.basePrice.toLocaleString("fa-IR")} تومان
                      </p>
                    </button>
                    {listing.portfolioImages.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setGalleryListing(listing)}
                        className="flex items-center gap-1.5 self-start rounded-full border border-border px-3 py-1.5 text-xs text-charcoal-muted hover:border-rose-300"
                      >
                        <Images className="h-3.5 w-3.5" strokeWidth={1.75} />
                        مشاهده‌ی نمونه‌کار
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </StepShell>
        )}

        {step === 2 && selectedListing && (
          <StepShell title="تایید سفارش">
            <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
              <div className="col-span-2">
                <dt className="text-charcoal-muted">پارتنر</dt>
                <dd className="font-medium text-charcoal">{selectedListing.businessName}</dd>
              </div>
              {customFields.map((field) => (
                <div key={field.key}>
                  <dt className="text-charcoal-muted">{field.label}</dt>
                  <dd className="font-medium text-charcoal">
                    {(selectedListing.customFieldValues[field.key] ?? 0).toLocaleString("fa-IR")}
                  </dd>
                </div>
              ))}
            </dl>

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
                subtotal={subtotal}
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
          </StepShell>
        )}

        {error ? <p className="text-center text-sm text-rose-700">{error}</p> : null}

        <div className="mt-auto">
          {step === 2 ? (
            <Button size="lg" className="w-full" disabled={!isStep2Valid || submitting} onClick={submitOrder}>
              {submitting ? "در حال ثبت…" : "ثبت سفارش و پرداخت"}
            </Button>
          ) : null}
        </div>
      </div>

      {galleryListing ? (
        <PortfolioGalleryModal
          businessName={galleryListing.businessName}
          images={galleryListing.portfolioImages}
          onClose={() => setGalleryListing(null)}
        />
      ) : null}
    </div>
  );
}
