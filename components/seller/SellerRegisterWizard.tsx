"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ImagePlus, Plus, X } from "lucide-react";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { DEFAULT_AVATARS } from "@/lib/avatars";
import { REFERRAL_SOURCES } from "@/lib/seller/registration";
import { normalizeIranianContactNumber } from "@/lib/validation/phone";

const STORAGE_KEY = "viora_seller_register_draft";
const TOTAL_STEPS = 4;
const MAX_PHONE_NUMBERS = 5;

const inputClass =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-charcoal focus:border-rose-400 focus:outline-none";

function digitsOnly(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d]/g, "");
}

type Answers = {
  businessName: string;
  avatarUrl: string | null;
  categoryIds: string[];
  description: string;
  businessLicenseImageUrl: string | null;
  contactPersonName: string;
  nationalId: string;
  unionId: string;
  bankAccountIban: string;
  termsAccepted: boolean;
  address: string;
  phoneNumbers: string[];
  referralSource: string | null;
  referralSourceOther: string;
};

const EMPTY_ANSWERS: Answers = {
  businessName: "",
  avatarUrl: DEFAULT_AVATARS[0]?.url ?? null,
  categoryIds: [],
  description: "",
  businessLicenseImageUrl: null,
  contactPersonName: "",
  nationalId: "",
  unionId: "",
  bankAccountIban: "",
  termsAccepted: false,
  address: "",
  phoneNumbers: [""],
  referralSource: null,
  referralSourceOther: "",
};

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm transition-colors",
        selected
          ? "border-gold-500 bg-gold-100 text-charcoal"
          : "border-border bg-surface text-charcoal-muted hover:border-rose-300",
      )}
    >
      {children}
    </button>
  );
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

async function uploadImage(file: File): Promise<{ url?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/seller/register/uploads", { method: "POST", body: formData });
    const data = await response.json();
    if (!response.ok) return { error: data.error ?? "بارگذاری تصویر ناموفق بود." };
    return { url: data.url as string };
  } catch {
    return { error: "ارتباط با سرور برقرار نشد." };
  }
}

export function SellerRegisterWizard({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const restoredOnce = useRef(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (restoredOnce.current) return;
    restoredOnce.current = true;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { answers: Answers; step: number };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnswers(draft.answers);
      setStep(draft.step);
    } catch {
      // ignore corrupt/unavailable sessionStorage - the wizard just starts fresh
    }
  }, []);

  function persist(nextAnswers: Answers, nextStep: number) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ answers: nextAnswers, step: nextStep }));
    } catch {
      // ignore - sessionStorage may be unavailable
    }
  }

  function update(patch: Partial<Answers>) {
    setAnswers((a) => {
      const next = { ...a, ...patch };
      persist(next, step);
      return next;
    });
  }

  function toggleCategory(id: string) {
    update({
      categoryIds: answers.categoryIds.includes(id)
        ? answers.categoryIds.filter((c) => c !== id)
        : [...answers.categoryIds, id],
    });
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setUploadingAvatar(true);
    const result = await uploadImage(file);
    if (result.url) update({ avatarUrl: result.url });
    else setError(result.error ?? "بارگذاری تصویر ناموفق بود.");
    setUploadingAvatar(false);
  }

  async function handleLicenseUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setUploadingLicense(true);
    const result = await uploadImage(file);
    if (result.url) update({ businessLicenseImageUrl: result.url });
    else setError(result.error ?? "بارگذاری تصویر ناموفق بود.");
    setUploadingLicense(false);
  }

  function updatePhone(index: number, value: string) {
    const next = [...answers.phoneNumbers];
    next[index] = digitsOnly(value);
    update({ phoneNumbers: next });
  }

  function addPhone() {
    if (answers.phoneNumbers.length >= MAX_PHONE_NUMBERS) return;
    update({ phoneNumbers: [...answers.phoneNumbers, ""] });
  }

  function removePhone(index: number) {
    if (answers.phoneNumbers.length <= 1) return;
    update({ phoneNumbers: answers.phoneNumbers.filter((_, i) => i !== index) });
  }

  function goBack() {
    if (step === 1) {
      router.push("/profile");
      return;
    }
    setError(null);
    setStep((s) => {
      persist(answers, s - 1);
      return s - 1;
    });
  }

  function goNext() {
    setError(null);
    setStep((s) => {
      persist(answers, Math.min(s + 1, TOTAL_STEPS));
      return Math.min(s + 1, TOTAL_STEPS);
    });
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/seller/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: answers.businessName,
          avatarUrl: answers.avatarUrl,
          categoryIds: answers.categoryIds,
          description: answers.description || undefined,
          businessLicenseImageUrl: answers.businessLicenseImageUrl,
          contactPersonName: answers.contactPersonName,
          nationalId: answers.nationalId,
          unionId: answers.unionId,
          bankAccountIban: answers.bankAccountIban,
          termsAccepted: answers.termsAccepted,
          address: answers.address,
          phoneNumbers: answers.phoneNumbers.map((p) => p.trim()).filter(Boolean),
          referralSource: answers.referralSource,
          referralSourceOther:
            answers.referralSource === "other" ? answers.referralSourceOther : undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }

      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      router.push("/seller");
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
            title="بیایید فروشگاهتان را بسازیم"
            subtitle="چند قدم ساده تا حضور شما در ویورا فاصله داریم."
          >
            <div className="space-y-1.5">
              <label htmlFor="businessName" className="text-sm font-medium text-charcoal">
                نام فروشگاه
              </label>
              <input
                id="businessName"
                type="text"
                value={answers.businessName}
                onChange={(event) => update({ businessName: event.target.value })}
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-charcoal">آواتار فروشگاه</p>
              <div className="grid grid-cols-5 gap-2">
                {DEFAULT_AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => update({ avatarUrl: avatar.url })}
                    className={cn(
                      "aspect-square overflow-hidden rounded-full border-2 transition-colors",
                      answers.avatarUrl === avatar.url ? "border-gold-500" : "border-transparent",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- small static asset, next/image is unnecessary weight here */}
                    <img src={avatar.url} alt="" className="h-full w-full" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-full border-2 border-dashed text-charcoal-muted disabled:opacity-50",
                    answers.avatarUrl &&
                      !DEFAULT_AVATARS.some((a) => a.url === answers.avatarUrl)
                      ? "border-gold-500"
                      : "border-border",
                  )}
                >
                  {answers.avatarUrl && !DEFAULT_AVATARS.some((a) => a.url === answers.avatarUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded logo preview, remote/S3 URL
                    <img src={answers.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <>
                      <ImagePlus className="h-4 w-4" strokeWidth={1.5} />
                      <span className="text-[9px]">لوگوی خودم</span>
                    </>
                  )}
                </button>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              {uploadingAvatar ? <p className="text-xs text-charcoal-muted">در حال بارگذاری لوگو…</p> : null}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-charcoal">
                فروشگاه شما در چه دسته‌بندی‌هایی فعالیت می‌کند؟
              </p>
              <p className="text-xs text-charcoal-muted">می‌توانید بیش از یک مورد انتخاب کنید.</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Chip
                    key={category.id}
                    selected={answers.categoryIds.includes(category.id)}
                    onClick={() => toggleCategory(category.id)}
                  >
                    {category.name}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="text-sm font-medium text-charcoal">
                توضیحات کوتاه درباره‌ی فروشگاه شما
              </label>
              <textarea
                id="description"
                rows={3}
                value={answers.description}
                onChange={(event) => update({ description: event.target.value })}
                placeholder="مثلاً: تولیدکننده و فروشنده‌ی لوازم تزیین جشن تولد با بیش از ۵ سال سابقه…"
                className={inputClass}
              />
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell
            title="اطلاعات هویتی و تجاری"
            subtitle="این اطلاعات فقط برای احراز هویت و واریز درآمد شما استفاده می‌شود."
          >
            <div className="space-y-2">
              <p className="text-sm font-medium text-charcoal">عکس پروانه‌ی کسب</p>
              <button
                type="button"
                onClick={() => licenseInputRef.current?.click()}
                disabled={uploadingLicense}
                className={cn(
                  "flex h-32 w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 border-dashed text-charcoal-muted disabled:opacity-50",
                  answers.businessLicenseImageUrl ? "border-gold-500" : "border-border",
                )}
              >
                {answers.businessLicenseImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user-uploaded document preview, remote/S3 URL
                  <img
                    src={answers.businessLicenseImageUrl}
                    alt="پیش‌نمایش پروانه‌ی کسب"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <>
                    <ImagePlus className="h-6 w-6" strokeWidth={1.5} />
                    <span className="text-xs">
                      {uploadingLicense ? "در حال بارگذاری…" : "آپلود تصویر پروانه‌ی کسب"}
                    </span>
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
              <label htmlFor="contactPersonName" className="text-sm font-medium text-charcoal">
                نام و نام‌خانوادگی مسئول فروشگاه
              </label>
              <input
                id="contactPersonName"
                type="text"
                value={answers.contactPersonName}
                onChange={(event) => update({ contactPersonName: event.target.value })}
                className={inputClass}
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
              <label htmlFor="unionId" className="text-sm font-medium text-charcoal">
                شناسه‌ی صنفی
              </label>
              <input
                id="unionId"
                type="text"
                dir="ltr"
                value={answers.unionId}
                onChange={(event) => update({ unionId: event.target.value })}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bankAccountIban" className="text-sm font-medium text-charcoal">
                شماره شبا
              </label>
              <input
                id="bankAccountIban"
                type="text"
                dir="ltr"
                placeholder="IR000000000000000000000000"
                value={answers.bankAccountIban}
                onChange={(event) => update({ bankAccountIban: event.target.value.toUpperCase() })}
                className={inputClass}
              />
              <p className="text-xs text-charcoal-muted">
                این شماره فقط برای واریز مستقیم درآمد فروش شما استفاده می‌شود.
              </p>
            </div>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell title="یک قدم تا پایان">
            <p className="text-center text-sm leading-7 text-charcoal-muted">
              خیلی خوب پیش رفتید! فقط کافیه قوانین همکاری با ویورا رو تایید کنید تا اطلاعاتتون
              برای بررسی ارسال بشه.
            </p>
            <label className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-sm text-charcoal">
              <input
                type="checkbox"
                checked={answers.termsAccepted}
                onChange={(event) => update({ termsAccepted: event.target.checked })}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
              />
              <span>
                <Link
                  href="/legal/seller-terms"
                  target="_blank"
                  className="font-medium text-rose-700 underline underline-offset-2"
                >
                  قوانین و شرایط همکاری با ویورا
                </Link>{" "}
                را مطالعه کرده‌ام و می‌پذیرم.
              </span>
            </label>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell title="تماس و آدرس">
            <div className="space-y-1.5">
              <label htmlFor="address" className="text-sm font-medium text-charcoal">
                آدرس فروشگاه یا انبار
              </label>
              <textarea
                id="address"
                rows={2}
                value={answers.address}
                onChange={(event) => update({ address: event.target.value })}
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-charcoal">شماره‌های تماس</p>
              <div className="flex flex-col gap-2">
                {answers.phoneNumbers.map((phone, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      value={phone}
                      onChange={(event) => updatePhone(index, event.target.value)}
                      className={inputClass}
                    />
                    {answers.phoneNumbers.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removePhone(index)}
                        aria-label="حذف شماره"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-charcoal-muted hover:bg-rose-50"
                      >
                        <X className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              {answers.phoneNumbers.length < MAX_PHONE_NUMBERS ? (
                <button
                  type="button"
                  onClick={addPhone}
                  className="flex items-center gap-1.5 text-sm font-medium text-rose-700"
                >
                  <Plus className="h-4 w-4" strokeWidth={2} />
                  افزودن شماره‌ی دیگر
                </button>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-charcoal">از چه طریقی با ویورا آشنا شدید؟</p>
              <div className="flex flex-wrap gap-2">
                {REFERRAL_SOURCES.map((option) => (
                  <Chip
                    key={option.value}
                    selected={answers.referralSource === option.value}
                    onClick={() => update({ referralSource: option.value })}
                  >
                    {option.label}
                  </Chip>
                ))}
              </div>
              {answers.referralSource === "other" ? (
                <input
                  type="text"
                  placeholder="لطفاً بگویید از کجا…"
                  value={answers.referralSourceOther}
                  onChange={(event) => update({ referralSourceOther: event.target.value })}
                  className={inputClass}
                />
              ) : null}
            </div>
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
              {submitting ? "در حال ارسال…" : "ثبت اطلاعات و ارسال برای ویورا"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function isStepAnswered(step: number, answers: Answers): boolean {
  switch (step) {
    case 1:
      return (
        answers.businessName.trim().length >= 2 &&
        answers.avatarUrl !== null &&
        answers.categoryIds.length >= 1 &&
        answers.description.trim().length >= 1
      );
    case 2:
      return (
        answers.businessLicenseImageUrl !== null &&
        answers.contactPersonName.trim().length >= 2 &&
        /^\d{10}$/.test(answers.nationalId) &&
        answers.unionId.trim().length >= 1 &&
        /^IR\d{24}$/.test(answers.bankAccountIban)
      );
    case 3:
      return answers.termsAccepted;
    case 4:
      return (
        answers.address.trim().length >= 1 &&
        answers.phoneNumbers.every((p) => normalizeIranianContactNumber(p) !== null) &&
        answers.referralSource !== null &&
        (answers.referralSource !== "other" || answers.referralSourceOther.trim().length >= 1)
      );
    default:
      return false;
  }
}
