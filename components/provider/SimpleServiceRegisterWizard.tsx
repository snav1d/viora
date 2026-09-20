"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ImagePlus } from "lucide-react";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { ServiceCustomFieldDef } from "@/lib/serviceCategories";

const TOTAL_STEPS = 2;

const inputClass =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-charcoal focus:border-rose-400 focus:outline-none";

function digitsOnly(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d]/g, "");
}

type Answers = {
  businessName: string;
  contactPersonName: string;
  licenseImageUrl: string | null;
  nationalId: string;
  bankAccountIban: string;
  basePrice: string;
  customFieldValues: Record<string, string>;
};

function emptyAnswers(customFields: ServiceCustomFieldDef[]): Answers {
  return {
    businessName: "",
    contactPersonName: "",
    licenseImageUrl: null,
    nationalId: "",
    bankAccountIban: "IR",
    basePrice: "",
    customFieldValues: Object.fromEntries(customFields.map((field) => [field.key, ""])),
  };
}

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

/// Registration wizard shared by every "simple" service-provider category (docs/decisions.md
/// ADR 43) - businessName/contactPersonName/license/nationalId/bankAccountIban step is identical
/// to ProviderRegisterWizard's (print) own step 1, duplicated rather than shared since the two
/// wizards' second steps diverge completely (print's color/finish/pricing-tier step has no
/// equivalent here) and print's own wizard/route is intentionally left untouched by this phase.
export function SimpleServiceRegisterWizard({
  categorySlug,
  categoryLabel,
  customFields,
}: {
  categorySlug: string;
  categoryLabel: string;
  customFields: ServiceCustomFieldDef[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>(() => emptyAnswers(customFields));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const licenseInputRef = useRef<HTMLInputElement>(null);

  function update(patch: Partial<Answers>) {
    setAnswers((a) => ({ ...a, ...patch }));
  }

  function updateCustomField(key: string, value: string) {
    setAnswers((a) => ({ ...a, customFieldValues: { ...a.customFieldValues, [key]: value } }));
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

  function isStepAnswered(currentStep: number): boolean {
    if (currentStep === 1) {
      return (
        answers.businessName.trim().length >= 2 &&
        answers.contactPersonName.trim().length >= 2 &&
        answers.licenseImageUrl !== null &&
        /^\d{10}$/.test(answers.nationalId) &&
        /^IR\d{24}$/.test(answers.bankAccountIban)
      );
    }
    const basePriceValid = /^\d+$/.test(answers.basePrice) && Number(answers.basePrice) > 0;
    const customFieldsValid = customFields.every((field) => {
      const value = answers.customFieldValues[field.key] ?? "";
      return /^\d+$/.test(value) && Number(value) > 0;
    });
    return basePriceValid && customFieldsValid;
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
      const response = await fetch("/api/provider/register/service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categorySlug,
          businessName: answers.businessName,
          contactPersonName: answers.contactPersonName,
          businessLicenseImageUrl: answers.licenseImageUrl,
          nationalId: answers.nationalId,
          bankAccountIban: answers.bankAccountIban,
          basePrice: Number(answers.basePrice),
          customFieldValues: Object.fromEntries(
            customFields.map((field) => [field.key, Number(answers.customFieldValues[field.key])]),
          ),
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

  const stepValid = isStepAnswered(step);

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
          <StepShell title={`معرفی پارتنر ${categoryLabel}`} subtitle="بیایید اطلاعات کسب‌وکار شما رو ثبت کنیم.">
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
                  maxLength={24}
                  value={answers.bankAccountIban.slice(2)}
                  onChange={(event) => update({ bankAccountIban: `IR${digitsOnly(event.target.value)}` })}
                  className="flex-1 min-w-0 bg-transparent px-4 py-3 text-charcoal focus:outline-none"
                />
              </div>
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title="تعرفه‌ی پکیج" subtitle="این مبلغ و مشخصات دقیقاً همینی هست که مشتری می‌بینه و می‌خره.">
            <div className="space-y-1.5">
              <label htmlFor="basePrice" className="text-sm font-medium text-charcoal">
                قیمت پکیج (تومان)
              </label>
              <input
                id="basePrice"
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={answers.basePrice ? Number(answers.basePrice).toLocaleString("fa-IR") : ""}
                onChange={(event) => update({ basePrice: digitsOnly(event.target.value) })}
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
                  value={answers.customFieldValues[field.key] ?? ""}
                  onChange={(event) => updateCustomField(field.key, digitsOnly(event.target.value))}
                  className={inputClass}
                />
              </div>
            ))}

            <p className="text-xs text-charcoal-muted">
              این مقادیر یه پکیج ثابته - مشتری فقط می‌بینه و می‌خره. هر وقت خواستید از پنل خودتون قابل‌ویرایش هست.
            </p>
          </StepShell>
        )}

        {error ? <p className="text-center text-sm text-rose-700">{error}</p> : null}

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
