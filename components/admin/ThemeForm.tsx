"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { JalaliDatePicker } from "@/components/ui/JalaliDatePicker";
import { CHAMPAGNE_ROSE_PALETTE, PALETTE_TOKEN_LABELS } from "@/lib/theme";
import { addDaysIso, todayIso } from "@/lib/jalali";

const inputClass =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-charcoal focus:border-charcoal focus:outline-none";

const TOKEN_GROUPS: { title: string; tokens: string[] }[] = [
  { title: "پس‌زمینه و سطح", tokens: ["warm-white", "surface"] },
  {
    title: "صورتی",
    tokens: ["rose-50", "rose-100", "rose-200", "rose-300", "rose-400", "rose-500", "rose-600", "rose-700"],
  },
  { title: "طلایی", tokens: ["gold-100", "gold-200", "gold-300", "gold-400", "gold-500", "gold-600"] },
  { title: "متن و خط", tokens: ["charcoal", "charcoal-muted", "border"] },
];

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

type ThemeInput = {
  id: string;
  name: string;
  palette: Record<string, string>;
  startsAt: string;
  endsAt: string;
};

export function ThemeForm({ theme }: { theme?: ThemeInput }) {
  const router = useRouter();
  const [name, setName] = useState(theme?.name ?? "");
  const [palette, setPalette] = useState<Record<string, string>>(theme?.palette ?? CHAMPAGNE_ROSE_PALETTE);
  const [startsAt, setStartsAt] = useState(theme?.startsAt ?? todayIso());
  const [endsAt, setEndsAt] = useState(theme?.endsAt ?? addDaysIso(todayIso(), 7));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setToken(token: string, value: string) {
    setPalette((current) => ({ ...current, [token]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const invalidToken = Object.entries(palette).find(([, value]) => !HEX_PATTERN.test(value));
    if (invalidToken) {
      setError(`رنگ «${PALETTE_TOKEN_LABELS[invalidToken[0]] ?? invalidToken[0]}» نامعتبر است.`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(theme ? `/api/admin/themes/${theme.id}` : "/api/admin/themes", {
        method: theme ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, palette, startsAt, endsAt }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }
      router.push("/admin/themes");
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
        <label htmlFor="name" className="text-sm font-medium text-charcoal">
          نام تم
        </label>
        <input
          id="name"
          type="text"
          required
          placeholder="مثلاً یلدا"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-charcoal">تاریخ شروع</p>
        <JalaliDatePicker value={startsAt} onChange={setStartsAt} />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-charcoal">تاریخ پایان</p>
        <JalaliDatePicker value={endsAt} onChange={setEndsAt} minIso={startsAt} />
      </div>

      <div className="flex items-center justify-between pt-1">
        <p className="text-sm font-medium text-charcoal">پالت رنگی</p>
        <button
          type="button"
          onClick={() => setPalette(CHAMPAGNE_ROSE_PALETTE)}
          className="text-xs text-rose-600 hover:underline"
        >
          بازگشت به پیش‌فرض
        </button>
      </div>

      {TOKEN_GROUPS.map((group) => (
        <div key={group.title} className="space-y-2 rounded-2xl border border-border p-3">
          <p className="text-xs font-medium text-charcoal-muted">{group.title}</p>
          <div className="grid grid-cols-2 gap-2">
            {group.tokens.map((token) => (
              <div
                key={token}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface px-2 py-2"
              >
                <input
                  type="color"
                  value={HEX_PATTERN.test(palette[token]) ? palette[token] : "#000000"}
                  onChange={(event) => setToken(token, event.target.value)}
                  aria-label={PALETTE_TOKEN_LABELS[token] ?? token}
                  className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] text-charcoal-muted">
                    {PALETTE_TOKEN_LABELS[token] ?? token}
                  </p>
                  <input
                    type="text"
                    dir="ltr"
                    value={palette[token]}
                    onChange={(event) => setToken(token, event.target.value)}
                    className="w-full bg-transparent text-xs text-charcoal focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {error ? <p className="text-sm text-error-500">{error}</p> : null}

      <Button type="submit" size="lg" disabled={submitting} className="mt-2 w-full">
        {submitting ? "در حال ذخیره…" : theme ? "ذخیره تغییرات" : "ساخت تم"}
      </Button>
    </form>
  );
}
