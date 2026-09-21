"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/// Inline editor for a SERVICE category's own defaultCommissionRate (docs/decisions.md ADR 45) -
/// seeds a newly-approved provider's commissionRate; the provider's own admin detail page can
/// still override it individually afterward. Kept separate from ActiveToggle since this is a
/// free-text percentage, not a boolean.
export function CategoryCommissionInput({
  id,
  defaultCommissionRate,
}: {
  id: string;
  defaultCommissionRate: number | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultCommissionRate !== null ? String(defaultCommissionRate) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultCommissionRate: value.trim() === "" ? null : Number(value),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="۱۰"
        className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-left text-xs text-charcoal focus:border-rose-400 focus:outline-none"
      />
      <span className="text-xs text-charcoal-muted">٪ کمیسیون پیش‌فرض</span>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-full border border-border px-2 py-1 text-xs text-charcoal-muted hover:bg-rose-50 disabled:opacity-50"
      >
        {saving ? "…" : "ذخیره"}
      </button>
      {error ? <p className="text-[10px] text-rose-700">{error}</p> : null}
    </div>
  );
}
