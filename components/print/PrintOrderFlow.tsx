"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, FileUp } from "lucide-react";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { MatchedPrintProvider } from "@/lib/data/print";

const TOTAL_STEPS = 3;

const inputClass =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-charcoal focus:border-rose-400 focus:outline-none";

function digitsOnly(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d]/g, "");
}

function todayPlus(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

type Finish = "CHROME" | "MATTE";

type Answers = {
  designFileUrl: string | null;
  finish: Finish | null;
  color: string | null;
  quantity: string;
  isExpressDelivery: boolean;
  requestedDeliveryDate: string;
  notes: string;
};

const EMPTY_ANSWERS: Answers = {
  designFileUrl: null,
  finish: null,
  color: null,
  quantity: "",
  isExpressDelivery: false,
  requestedDeliveryDate: todayPlus(1),
  notes: "",
};

function StepShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <h1 className="text-center text-lg font-semibold text-charcoal">{title}</h1>
      {children}
    </div>
  );
}

export function PrintOrderFlow({
  colors,
  deliverySettings,
}: {
  colors: string[];
  deliverySettings: { expressFee: number; normalTurnaroundText: string };
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [uploading, setUploading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [providers, setProviders] = useState<MatchedPrintProvider[]>([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update(patch: Partial<Answers>) {
    setAnswers((a) => ({ ...a, ...patch }));
  }

  function isStep1Valid() {
    return (
      answers.designFileUrl !== null &&
      answers.finish !== null &&
      answers.color !== null &&
      /^\d+$/.test(answers.quantity) &&
      Number(answers.quantity) > 0 &&
      (!answers.isExpressDelivery || answers.requestedDeliveryDate.length > 0)
    );
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/print-orders/uploads", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "بارگذاری فایل ناموفق بود.");
        return;
      }
      update({ designFileUrl: data.url as string });
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setUploading(false);
    }
  }

  async function goToProviders() {
    setError(null);
    setMatching(true);
    try {
      const response = await fetch("/api/print-orders/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finish: answers.finish,
          color: answers.color,
          quantity: Number(answers.quantity),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }
      setProviders(data.providers as MatchedPrintProvider[]);
      setStep(2);
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setMatching(false);
    }
  }

  function goBack() {
    setError(null);
    if (step === 1) {
      router.push("/home");
      return;
    }
    setStep((s) => s - 1);
  }

  function selectProvider(offeringId: string) {
    setSelectedOfferingId(offeringId);
    setStep(3);
  }

  async function submitOrder() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/print-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offeringId: selectedOfferingId,
          finish: answers.finish,
          color: answers.color,
          quantity: Number(answers.quantity),
          designFileUrl: answers.designFileUrl,
          notes: answers.notes || undefined,
          isExpressDelivery: answers.isExpressDelivery,
          requestedDeliveryDate: answers.isExpressDelivery ? answers.requestedDeliveryDate : undefined,
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

  const selectedProvider = providers.find((p) => p.offeringId === selectedOfferingId) ?? null;
  const quantity = Number(answers.quantity) || 0;
  const total =
    selectedProvider ? selectedProvider.totalPrice + (answers.isExpressDelivery ? deliverySettings.expressFee : 0) : 0;

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
          <StepShell title="سفارش چاپ بادکنک تبلیغاتی">
            <div className="space-y-2">
              <p className="text-sm font-medium text-charcoal">فایل طرح</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "flex h-24 w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed text-charcoal-muted disabled:opacity-50",
                  answers.designFileUrl ? "border-gold-500" : "border-border",
                )}
              >
                <FileUp className="h-6 w-6" strokeWidth={1.5} />
                <span className="text-xs">
                  {uploading
                    ? "در حال بارگذاری…"
                    : answers.designFileUrl
                      ? "فایل بارگذاری شد ✓"
                      : "آپلود فایل طرح (تصویر یا PDF)"}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-charcoal">نوع بادکنک</p>
              <div className="flex gap-2">
                {(["CHROME", "MATTE"] as const).map((finish) => (
                  <button
                    key={finish}
                    type="button"
                    onClick={() => update({ finish })}
                    className={cn(
                      "flex-1 rounded-2xl border px-4 py-3 text-sm transition-colors",
                      answers.finish === finish
                        ? "border-gold-500 bg-gold-100 text-charcoal"
                        : "border-border bg-surface text-charcoal-muted",
                    )}
                  >
                    {finish === "CHROME" ? "کروم" : "مات"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="color" className="text-sm font-medium text-charcoal">
                رنگ بادکنک
              </label>
              <select
                id="color"
                value={answers.color ?? ""}
                onChange={(event) => update({ color: event.target.value || null })}
                className={inputClass}
              >
                <option value="" disabled>
                  انتخاب کنید…
                </option>
                {colors.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="quantity" className="text-sm font-medium text-charcoal">
                تیراژ
              </label>
              <input
                id="quantity"
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={answers.quantity}
                onChange={(event) => update({ quantity: digitsOnly(event.target.value) })}
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-charcoal">تاریخ تحویل</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => update({ isExpressDelivery: false })}
                  className={cn(
                    "flex-1 rounded-2xl border px-4 py-3 text-sm transition-colors",
                    !answers.isExpressDelivery
                      ? "border-gold-500 bg-gold-100 text-charcoal"
                      : "border-border bg-surface text-charcoal-muted",
                  )}
                >
                  عادی
                </button>
                <button
                  type="button"
                  onClick={() => update({ isExpressDelivery: true })}
                  className={cn(
                    "flex-1 rounded-2xl border px-4 py-3 text-sm transition-colors",
                    answers.isExpressDelivery
                      ? "border-gold-500 bg-gold-100 text-charcoal"
                      : "border-border bg-surface text-charcoal-muted",
                  )}
                >
                  فوری
                </button>
              </div>
              {answers.isExpressDelivery ? (
                <div className="space-y-1.5">
                  <input
                    type="date"
                    min={todayPlus(1)}
                    value={answers.requestedDeliveryDate}
                    onChange={(event) => update({ requestedDeliveryDate: event.target.value })}
                    className={inputClass}
                  />
                  <p className="text-xs text-charcoal-muted">
                    هزینه‌ی اضافه‌ی تحویل فوری: {deliverySettings.expressFee.toLocaleString("fa-IR")} تومان
                  </p>
                </div>
              ) : (
                <p className="text-xs text-charcoal-muted">
                  زمان تحویل تقریبی: {deliverySettings.normalTurnaroundText}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="notes" className="text-sm font-medium text-charcoal">
                توضیحات (اختیاری)
              </label>
              <textarea
                id="notes"
                rows={3}
                value={answers.notes}
                onChange={(event) => update({ notes: event.target.value })}
                className={inputClass}
              />
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title="پارتنرهای واجدشرایط">
            {providers.length === 0 ? (
              <p className="py-10 text-center text-sm text-charcoal-muted">
                فعلاً پارتنری با این مشخصات پیدا نشد. لطفاً تیراژ، رنگ یا نوع بادکنک را تغییر دهید.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {providers.map((provider) => (
                  <button
                    key={provider.offeringId}
                    type="button"
                    onClick={() => selectProvider(provider.offeringId)}
                    className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4 text-right text-sm hover:border-rose-300"
                  >
                    <p className="font-medium text-charcoal">{provider.businessName}</p>
                    <p className="text-charcoal-muted">
                      {provider.completedOrderCount.toLocaleString("fa-IR")} سفارش قبلی · امتیاز —
                    </p>
                    <p className="font-semibold text-rose-700">
                      {provider.totalPrice.toLocaleString("fa-IR")} تومان
                    </p>
                  </button>
                ))}
              </div>
            )}
          </StepShell>
        )}

        {step === 3 && selectedProvider && (
          <StepShell title="تایید سفارش">
            <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
              <div className="col-span-2">
                <dt className="text-charcoal-muted">پارتنر</dt>
                <dd className="font-medium text-charcoal">{selectedProvider.businessName}</dd>
              </div>
              <div>
                <dt className="text-charcoal-muted">تیراژ</dt>
                <dd className="font-medium text-charcoal">{quantity.toLocaleString("fa-IR")} عدد</dd>
              </div>
              <div>
                <dt className="text-charcoal-muted">نوع و رنگ</dt>
                <dd className="font-medium text-charcoal">
                  {answers.finish === "CHROME" ? "کروم" : "مات"} · {answers.color}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-charcoal-muted">تاریخ تحویل</dt>
                <dd className="font-medium text-charcoal">
                  {answers.isExpressDelivery
                    ? `فوری - ${new Date(answers.requestedDeliveryDate).toLocaleDateString("fa-IR")}`
                    : `عادی (${deliverySettings.normalTurnaroundText})`}
                </dd>
              </div>
              <div className="col-span-2 border-t border-border pt-3">
                <dt className="text-charcoal-muted">جمع کل</dt>
                <dd className="text-base font-semibold text-charcoal">
                  {total.toLocaleString("fa-IR")} تومان
                </dd>
              </div>
            </dl>
          </StepShell>
        )}

        {error ? <p className="text-center text-sm text-rose-700">{error}</p> : null}

        <div className="mt-auto">
          {step === 1 && (
            <Button size="lg" className="w-full" disabled={!isStep1Valid() || matching} onClick={goToProviders}>
              {matching ? "در حال جستجو…" : "یافتن پارتنر"}
            </Button>
          )}
          {step === 3 && (
            <Button size="lg" className="w-full" disabled={submitting} onClick={submitOrder}>
              {submitting ? "در حال ثبت…" : "ثبت سفارش و پرداخت"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
