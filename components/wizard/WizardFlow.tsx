"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { Button, ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useCart } from "@/lib/cart/CartContext";
import type { SuggestedBundle } from "@/lib/wizard/engine";
import {
  AGE_BUCKETS,
  BUDGET_PRESETS,
  EMPTY_ANSWERS,
  GUEST_COUNT_PRESETS,
  type WizardAnswers,
} from "@/lib/wizard/types";

const STORAGE_KEY = "viora_wizard_draft";
const TOTAL_STEPS = 5;

type ThemeOption = { id: string; label: string; audience: string };
type CityOption = { id: string; name: string };

const AUDIENCE_LABELS: Record<string, string> = {
  girl: "تم‌های دخترانه",
  boy: "تم‌های پسرانه",
  baby: "تم‌های نوزادی",
  unisex: "تم‌های همه‌سنی",
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

export function WizardFlow({ cities, themes }: { cities: CityOption[]; themes: ThemeOption[] }) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<WizardAnswers>(EMPTY_ANSWERS);
  const [bundle, setBundle] = useState<SuggestedBundle | null>(null);
  const [customGuestCount, setCustomGuestCount] = useState("");
  const [customBudget, setCustomBudget] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSubmitAttempted = useRef(false);
  const router = useRouter();
  const { addItem } = useCart();

  useEffect(() => {
    if (autoSubmitAttempted.current) return;
    autoSubmitAttempted.current = true;

    // One-time resume of a draft saved before an auth redirect (see submit() below) - must run
    // after mount since sessionStorage is a browser-only API.
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { answers: WizardAnswers; pendingSubmit?: boolean };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnswers(draft.answers);
      setStep(TOTAL_STEPS);
      if (draft.pendingSubmit) {
        void submit(draft.answers);
      }
    } catch {
      // ignore corrupt/unavailable sessionStorage - wizard just starts fresh
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(nextAnswers: WizardAnswers, pendingSubmit: boolean) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ answers: nextAnswers, pendingSubmit }));
    } catch {
      // ignore - sessionStorage may be unavailable
    }
  }

  async function submit(finalAnswers: WizardAnswers) {
    setError(null);
    setSubmitting(true);
    persist(finalAnswers, true);

    try {
      const response = await fetch("/api/party-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ageGroup: finalAnswers.ageGroup,
          guestCount: finalAnswers.guestCount,
          budget: finalAnswers.budget,
          cityId: finalAnswers.cityId,
          theme: finalAnswers.theme,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.requiresAuth) {
          router.push(`/auth?redirect=${encodeURIComponent("/wizard")}`);
          return;
        }
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }

      persist(finalAnswers, false);
      setBundle(data.bundle);
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  function goBack() {
    if (step === 1) {
      router.push("/home");
      return;
    }
    setStep((s) => s - 1);
  }

  function goNext() {
    setError(null);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  if (bundle) {
    const productItems = bundle.items.filter((item) => item.kind === "product");
    const serviceItems = bundle.items.filter((item) => item.kind === "service");

    function addBundleToCart() {
      for (const item of productItems) {
        addItem(
          { productId: item.id, slug: item.slug, title: item.title, price: item.unitPrice },
          item.quantity,
        );
      }
      router.push("/cart");
    }

    return (
      <div className="flex flex-1 flex-col gap-5 px-6 py-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-100 text-gold-600">
            <Sparkles className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <h1 className="text-lg font-semibold text-charcoal">سبد پیشنهادی شما</h1>
          <p className="mx-auto max-w-xs whitespace-pre-line text-sm leading-6 text-charcoal-muted">
            {bundle.summaryText}
          </p>
        </div>

        {bundle.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-10 text-center">
            <p className="max-w-xs text-sm text-charcoal-muted">
              فعلاً محصول فعالی در {answers.cityName} برای این ترکیب پیدا نشد. می‌توانید خودتان از
              فروشگاه انتخاب کنید.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {productItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3 text-sm"
              >
                <div className="space-y-0.5">
                  <p className="text-xs text-charcoal-muted">{item.categoryLabel}</p>
                  <p className="font-medium text-charcoal">{item.title}</p>
                  {item.quantity > 1 && (
                    <p className="text-xs text-charcoal-muted">
                      {item.quantity.toLocaleString("fa-IR")} عدد
                    </p>
                  )}
                </div>
                <p className="font-semibold text-rose-700">
                  {item.lineTotal.toLocaleString("fa-IR")} تومان
                </p>
              </div>
            ))}

            {serviceItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-dashed border-border p-3 text-sm"
              >
                <div className="space-y-0.5">
                  <p className="text-xs text-charcoal-muted">{item.categoryLabel}</p>
                  <p className="font-medium text-charcoal">{item.title}</p>
                  <p className="text-xs text-charcoal-muted">
                    این خدمت جداگانه هماهنگ می‌شود، به سبد خرید اضافه نمی‌شود.
                  </p>
                </div>
                <p className="font-semibold text-rose-700">
                  {item.lineTotal.toLocaleString("fa-IR")} تومان
                </p>
              </div>
            ))}

            <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold text-charcoal">
              <span>جمع کل</span>
              <span>{bundle.totalAmount.toLocaleString("fa-IR")} تومان</span>
            </div>
          </div>
        )}

        <div className="mt-auto space-y-2">
          {productItems.length > 0 && (
            <Button size="lg" className="w-full" onClick={addBundleToCart}>
              افزودن همه به سبد خرید
            </Button>
          )}
          <ButtonLink href="/shop" size="lg" variant="secondary" className="w-full">
            مشاهده‌ی فروشگاه
          </ButtonLink>
        </div>
      </div>
    );
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
          <StepShell title="جشن برای چه سنی است؟">
            <div className="flex flex-wrap justify-center gap-2">
              {AGE_BUCKETS.map((bucket) => (
                <Chip
                  key={bucket}
                  selected={answers.ageGroup === bucket}
                  onClick={() => setAnswers((a) => ({ ...a, ageGroup: bucket }))}
                >
                  {bucket}
                </Chip>
              ))}
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title="چند مهمان دارید؟">
            <div className="flex flex-wrap justify-center gap-2">
              {GUEST_COUNT_PRESETS.map((preset) => (
                <Chip
                  key={preset}
                  selected={answers.guestCount === preset}
                  onClick={() => {
                    setCustomGuestCount("");
                    setAnswers((a) => ({ ...a, guestCount: preset }));
                  }}
                >
                  {preset.toLocaleString("fa-IR")} نفر
                </Chip>
              ))}
            </div>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="تعداد دیگر…"
              value={customGuestCount}
              onChange={(event) => {
                setCustomGuestCount(event.target.value);
                const value = Number(event.target.value);
                setAnswers((a) => ({ ...a, guestCount: value > 0 ? value : null }));
              }}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-center text-charcoal focus:border-rose-400 focus:outline-none"
            />
          </StepShell>
        )}

        {step === 3 && (
          <StepShell title="بودجه‌ی شما چقدر است؟">
            <div className="flex flex-wrap justify-center gap-2">
              {BUDGET_PRESETS.map((preset) => (
                <Chip
                  key={preset}
                  selected={answers.budget === preset}
                  onClick={() => {
                    setCustomBudget("");
                    setAnswers((a) => ({ ...a, budget: preset }));
                  }}
                >
                  {preset.toLocaleString("fa-IR")}
                </Chip>
              ))}
            </div>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="بودجه‌ی دیگر (تومان)…"
              value={customBudget}
              onChange={(event) => {
                setCustomBudget(event.target.value);
                const value = Number(event.target.value);
                setAnswers((a) => ({ ...a, budget: value > 0 ? value : null }));
              }}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-center text-charcoal focus:border-rose-400 focus:outline-none"
            />
          </StepShell>
        )}

        {step === 4 && (
          <StepShell title="جشن در کدام شهر برگزار می‌شود؟">
            <div className="flex flex-col gap-2">
              {cities.map((city) => (
                <button
                  key={city.id}
                  onClick={() => setAnswers((a) => ({ ...a, cityId: city.id, cityName: city.name }))}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm transition-colors",
                    answers.cityId === city.id
                      ? "border-gold-500 bg-gold-100 text-charcoal"
                      : "border-border bg-surface text-charcoal-muted hover:border-rose-300",
                  )}
                >
                  {city.name}
                </button>
              ))}
            </div>
          </StepShell>
        )}

        {step === 5 && (
          <StepShell title="چه تمی مدنظرتان است؟">
            <div className="flex flex-col gap-4">
              {Object.entries(AUDIENCE_LABELS).map(([audience, label]) => {
                const options = themes.filter((theme) => theme.audience === audience);
                if (options.length === 0) return null;
                return (
                  <div key={audience} className="space-y-2">
                    <p className="text-xs font-medium text-charcoal-muted">{label}</p>
                    <div className="flex flex-wrap gap-2">
                      {options.map((theme) => (
                        <Chip
                          key={theme.id}
                          selected={answers.theme === theme.label}
                          onClick={() => setAnswers((a) => ({ ...a, theme: theme.label }))}
                        >
                          {theme.label}
                        </Chip>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </StepShell>
        )}

        {error ? <p className="text-center text-sm text-rose-700">{error}</p> : null}

        <div className="mt-auto">
          {step < TOTAL_STEPS ? (
            <Button
              size="lg"
              className="w-full"
              disabled={!isStepAnswered(step, answers)}
              onClick={goNext}
            >
              بعدی
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full"
              disabled={!isStepAnswered(step, answers) || submitting}
              onClick={() => submit(answers)}
            >
              {submitting ? "در حال ثبت…" : "مشاهده‌ی پیشنهاد"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <h1 className="text-center text-lg font-semibold text-charcoal">{title}</h1>
      {children}
    </div>
  );
}

function isStepAnswered(step: number, answers: WizardAnswers): boolean {
  switch (step) {
    case 1:
      return answers.ageGroup !== null;
    case 2:
      return answers.guestCount !== null && answers.guestCount > 0;
    case 3:
      return answers.budget !== null && answers.budget > 0;
    case 4:
      return answers.cityId !== null;
    case 5:
      return answers.theme !== null;
    default:
      return false;
  }
}
