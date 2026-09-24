"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/// Lets an admin override one specific provider's commissionRate anytime after approval (docs/
/// decisions.md ADR 45) - separate from CategoryCommissionInput, which only sets the category-
/// wide default a future approval seeds from.
export function ProviderCommissionInput({
  providerId,
  commissionRate,
}: {
  providerId: string;
  commissionRate: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(commissionRate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/providers/${providerId}/commission`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionRate: Number(value) }),
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
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-left text-sm text-charcoal focus:border-charcoal focus:outline-none"
        />
        <span className="text-sm text-charcoal-muted">٪</span>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full border border-border px-2 py-1 text-xs text-charcoal-muted hover:bg-rose-50 disabled:opacity-50"
        >
          {saving ? "…" : "ذخیره"}
        </button>
      </div>
      {error ? <p className="text-[10px] text-error-500">{error}</p> : null}
    </div>
  );
}
