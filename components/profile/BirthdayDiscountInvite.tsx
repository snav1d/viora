"use client";

import { useState } from "react";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { JalaliDatePicker } from "@/components/ui/JalaliDatePicker";

function yearsAgoIso(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().slice(0, 10);
}

/// Shown under the account name/phone only while User.birthDate is still empty (docs/
/// decisions.md ADR 45) - a one-time claim, so once submitted this whole component just shows
/// the issued code and never reopens the form again on this page load.
export function BirthdayDiscountInvite() {
  const [open, setOpen] = useState(false);
  const [birthDate, setBirthDate] = useState(yearsAgoIso(25));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string; typeLabel: string; value: number } | null>(null);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/profile/birthday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }
      // Deliberately no router.refresh() here - the parent server component only renders this
      // whole component while User.birthDate is still null, so refreshing would immediately
      // unmount it and wipe the success message below before the customer ever sees their code
      // on screen (their only real way to see it - the mock SmsProvider only logs to console,
      // it never actually reaches a phone). This component's own local `result` state is enough:
      // a later page reload correctly won't show the invite again, since the server will see the
      // now-set birthDate by then.
      setResult({ code: data.code, typeLabel: data.typeLabel, value: data.value });
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="flex flex-col gap-1 rounded-2xl border border-gold-200 bg-gold-50 p-4 text-sm">
        <p className="font-medium text-charcoal">تولدت مبارک! 🎉</p>
        <p className="text-charcoal-muted">
          کد تخفیف {result.typeLabel === "درصدی" ? `${result.value.toLocaleString("fa-IR")}٪` : `${result.value.toLocaleString("fa-IR")} تومان`} تو، همین الان هم پیامک شد:
        </p>
        <p dir="ltr" className="mt-1 text-left text-base font-bold text-gold-600">
          {result.code}
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-2xl border border-dashed border-gold-300 bg-gold-50/60 px-4 py-3 text-sm font-medium text-gold-600 hover:bg-gold-50"
      >
        <Gift className="h-4 w-4" strokeWidth={1.75} />
        دریافت رایگان کد تخفیف
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm font-medium text-charcoal">تاریخ تولدت رو بگو تا کد تخفیفت رو بفرستیم</p>
      <JalaliDatePicker value={birthDate} onChange={setBirthDate} minIso={yearsAgoIso(100)} />
      {error ? <p className="text-sm text-error-500">{error}</p> : null}
      <Button size="md" disabled={submitting} onClick={submit}>
        {submitting ? "در حال ثبت…" : "دریافت کد تخفیف"}
      </Button>
    </div>
  );
}
