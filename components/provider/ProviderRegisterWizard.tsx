"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ImagePlus, Plus } from "lucide-react";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { Button } from "@/components/ui/Button";
import { PortfolioUploadStep } from "@/components/provider/PortfolioUploadStep";
import { cn } from "@/lib/cn";
import { MIN_REGISTRATION_PORTFOLIO_IMAGES } from "@/lib/portfolio";

const TOTAL_STEPS = 3;

const inputClass =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-charcoal focus:border-charcoal focus:outline-none";

function digitsOnly(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d]/g, "");
}

type Tier = { minQuantity: string; maxQuantity: string; unitPrice: string };

type Answers = {
  businessName: string;
  contactPersonName: string;
  licenseImageUrl: string | null;
  nationalId: string;
  bankAccountIban: string;
  supportsChrome: boolean;
  supportsMatte: boolean;
  colors: string[];
  minOrderQuantity: string;
  tiers: Tier[];
  portfolioImages: string[];
};

const EMPTY_ANSWERS: Answers = {
  businessName: "",
  contactPersonName: "",
  licenseImageUrl: null,
  nationalId: "",
  bankAccountIban: "IR",
  supportsChrome: false,
  supportsMatte: false,
  colors: [],
  minOrderQuantity: "",
  tiers: [{ minQuantity: "", maxQuantity: "", unitPrice: "" }],
  portfolioImages: [],
};

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5 text-center">
        <h1 className="text-lg font-semibold text-charcoal">{title}</h1>
        {subtitle ? <p className="text-sm text-charcoal-muted">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

function isStepAnswered(step: number, answers: Answers): boolean {
  if (step === 1) {
    return (
      answers.businessName.trim().length >= 2 &&
      answers.contactPersonName.trim().length >= 2 &&
      answers.licenseImageUrl !== null &&
      /^\d{10}$/.test(answers.nationalId) &&
      /^IR\d{24}$/.test(answers.bankAccountIban)
    );
  }
  if (step === 2) {
    const quantityValid = /^\d+$/.test(answers.minOrderQuantity) && Number(answers.minOrderQuantity) > 0;
    const tiersValid =
      answers.tiers.length > 0 &&
      answers.tiers.every((tier) => {
        const min = Number(tier.minQuantity);
        const price = Number(tier.unitPrice);
        if (!tier.minQuantity || !(min > 0) || !tier.unitPrice || !(price > 0)) return false;
        if (tier.maxQuantity && !(Number(tier.maxQuantity) > min)) return false;
        return true;
      });
    return (
      (answers.supportsChrome || answers.supportsMatte) &&
      answers.colors.length >= 1 &&
      quantityValid &&
      tiersValid
    );
  }
  return answers.portfolioImages.length >= MIN_REGISTRATION_PORTFOLIO_IMAGES;
}

export function ProviderRegisterWizard({ colors }: { colors: string[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const licenseInputRef = useRef<HTMLInputElement>(null);

  function update(patch: Partial<Answers>) {
    setAnswers((a) => ({ ...a, ...patch }));
  }

  async function handleLicenseUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setUploadingLicense(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/provider/register/uploads", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "بارگذاری تصویر ناموفق بود.");
        return;
      }
      update({ licenseImageUrl: data.url as string });
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setUploadingLicense(false);
    }
  }

  function toggleColor(color: string) {
    update({
      colors: answers.colors.includes(color)
        ? answers.colors.filter((c) => c !== color)
        : [...answers.colors, color],
    });
  }

  function updateTier(index: number, patch: Partial<Tier>) {
    const next = [...answers.tiers];
    next[index] = { ...next[index], ...patch };
    update({ tiers: next });
  }

  function addTier() {
    update({ tiers: [...answers.tiers, { minQuantity: "", maxQuantity: "", unitPrice: "" }] });
  }

  function removeTier(index: number) {
    if (answers.tiers.length <= 1) return;
    update({ tiers: answers.tiers.filter((_, i) => i !== index) });
  }

  function goBack() {
    if (step === 1) {
      router.push("/profile");
      return;
    }
    setError(null);
    setStep((s) => s - 1);
  }

  function goNext() {
    setError(null);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/provider/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: answers.businessName,
          contactPersonName: answers.contactPersonName,
          businessLicenseImageUrl: answers.licenseImageUrl,
          nationalId: answers.nationalId,
          bankAccountIban: answers.bankAccountIban,
          supportsChrome: answers.supportsChrome,
          supportsMatte: answers.supportsMatte,
          printableColors: answers.colors,
          minOrderQuantity: Number(answers.minOrderQuantity),
          pricingTiers: answers.tiers.map((tier) => ({
            minQuantity: Number(tier.minQuantity),
            maxQuantity: tier.maxQuantity ? Number(tier.maxQuantity) : null,
            unitPrice: Number(tier.unitPrice),
          })),
          portfolioImageUrls: answers.portfolioImages,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }

      router.push("/provider");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  const stepValid = isStepAnswered(step, answers);

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
          <StepShell
            title="معرفی پارتنر تولید"
            subtitle="بیایید اطلاعات کسب‌وکار شما رو ثبت کنیم."
          >
            <div className="space-y-1.5">
              <label htmlFor="businessName" className="text-sm font-medium text-charcoal">
                نام کسب‌وکار
              </label>
              <input
                id="businessName"
                type="text"
                value={answers.businessName}
                onChange={(event) => update({ businessName: event.target.value })}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contactPersonName" className="text-sm font-medium text-charcoal">
                نام و نام‌خانوادگی مسئول کسب‌وکار
              </label>
              <input
                id="contactPersonName"
                type="text"
                value={answers.contactPersonName}
                onChange={(event) => update({ contactPersonName: event.target.value })}
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-charcoal">مدارک (پروانه‌ی کسب یا مدرک هویتی)</p>
              <button
                type="button"
                onClick={() => licenseInputRef.current?.click()}
                disabled={uploadingLicense}
                className={cn(
                  "flex h-32 w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 border-dashed text-charcoal-muted disabled:opacity-50",
                  answers.licenseImageUrl ? "border-gold-500" : "border-border",
                )}
              >
                {answers.licenseImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user-uploaded document preview, remote/S3 URL
                  <img
                    src={answers.licenseImageUrl}
                    alt="پیش‌نمایش مدارک"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <>
                    <ImagePlus className="h-6 w-6" strokeWidth={1.5} />
                    <span className="text-xs">{uploadingLicense ? "در حال بارگذاری…" : "آپلود تصویر مدارک"}</span>
                  </>
                )}
              </button>
              <input
                ref={licenseInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLicenseUpload}
                className="hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="nationalId" className="text-sm font-medium text-charcoal">
                کد ملی
              </label>
              <input
                id="nationalId"
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={answers.nationalId}
                onChange={(event) => update({ nationalId: digitsOnly(event.target.value) })}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bankAccountIban" className="text-sm font-medium text-charcoal">
                شماره شبا
              </label>
              <div
                dir="ltr"
                className="flex items-stretch overflow-hidden rounded-2xl border border-border bg-surface focus-within:border-rose-400"
              >
                <span className="flex items-center border-l border-border bg-border/30 px-3 text-charcoal-muted">
                  IR
                </span>
                <input
                  id="bankAccountIban"
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  value={answers.bankAccountIban.slice(2)}
                  onChange={(event) =>
                    update({ bankAccountIban: `IR${digitsOnly(event.target.value).slice(0, 24)}` })
                  }
                  className="flex-1 min-w-0 bg-transparent px-4 py-3 text-charcoal focus:outline-none"
                />
              </div>
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title="تنظیمات چاپ" subtitle="این تنظیمات مشخص می‌کنه چه سفارش‌هایی به شما پیشنهاد بشه.">
            <div className="space-y-2">
              <p className="text-sm font-medium text-charcoal">نوع بادکنک قابل‌چاپ</p>
              <div className="flex gap-2">
                <label
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm transition-colors",
                    answers.supportsChrome
                      ? "border-gold-500 bg-gold-100 text-charcoal"
                      : "border-border bg-surface text-charcoal-muted",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={answers.supportsChrome}
                    onChange={(event) => update({ supportsChrome: event.target.checked })}
                    className="h-4 w-4 rounded border-border"
                  />
                  کروم
                </label>
                <label
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm transition-colors",
                    answers.supportsMatte
                      ? "border-gold-500 bg-gold-100 text-charcoal"
                      : "border-border bg-surface text-charcoal-muted",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={answers.supportsMatte}
                    onChange={(event) => update({ supportsMatte: event.target.checked })}
                    className="h-4 w-4 rounded border-border"
                  />
                  مات
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-charcoal">رنگ‌های قابل‌چاپ</p>
              {colors.length === 0 ? (
                <p className="text-sm text-charcoal-muted">
                  فعلاً رنگی توسط ویورا تعریف نشده. لطفاً بعداً دوباره سر بزنید.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => {
                    const checked = answers.colors.includes(color);
                    return (
                      <label
                        key={color}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                          checked
                            ? "border-gold-500 bg-gold-100 text-charcoal"
                            : "border-border bg-surface text-charcoal-muted",
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
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="minOrderQuantity" className="text-sm font-medium text-charcoal">
                حداقل تیراژ قابل‌قبول
              </label>
              <input
                id="minOrderQuantity"
                type="text"
                inputMode="numeric"
                value={answers.minOrderQuantity}
                onChange={(event) => update({ minOrderQuantity: digitsOnly(event.target.value) })}
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-charcoal">تعرفه‌ی پلکانی بر اساس تیراژ</p>
              <div className="flex flex-col gap-3">
                {answers.tiers.map((tier, index) => (
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
                    {answers.tiers.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeTier(index)}
                        className="self-start text-xs text-rose-700"
                      >
                        حذف این بازه
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addTier}
                className="flex items-center gap-1.5 text-sm font-medium text-rose-700"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                افزودن بازه‌ی دیگر
              </button>
            </div>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell title="نمونه‌کار" subtitle="حداقل چند تصویر از کارهای قبلی‌تون رو اضافه کنید.">
            <PortfolioUploadStep
              images={answers.portfolioImages}
              onChange={(portfolioImages) => update({ portfolioImages })}
              minImages={MIN_REGISTRATION_PORTFOLIO_IMAGES}
            />
          </StepShell>
        )}

        {error ? <p className="text-center text-sm text-error-500">{error}</p> : null}

        <div className="mt-auto">
          {step < TOTAL_STEPS ? (
            <Button size="lg" className="w-full" disabled={!stepValid} onClick={goNext}>
              بعدی
            </Button>
          ) : (
            <Button size="lg" className="w-full" disabled={!stepValid || submitting} onClick={submit}>
              {submitting ? "در حال ارسال…" : "ثبت اطلاعات و ارسال برای بررسی"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
