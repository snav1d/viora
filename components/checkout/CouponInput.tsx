"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

// Shared by the cart checkout and the print-order flow (docs/decisions.md ADR 35) - the same
// "type a code, see the discount before committing" interaction either way. Never trusted at the
// actual order-creation call - both order routes re-validate the code themselves.
export function CouponInput({
  subtotal,
  appliedCode,
  onApplied,
  onRemoved,
}: {
  subtotal: number;
  appliedCode: string | null;
  onApplied: (code: string, discountAmount: number) => void;
  onRemoved: () => void;
}) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    if (!code.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }
      onApplied(code.trim().toUpperCase(), data.discountAmount as number);
      setCode("");
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-gold-500 bg-gold-100 px-4 py-3 text-sm">
        <span dir="ltr" className="font-medium text-charcoal">
          کد «{appliedCode}» اعمال شد
        </span>
        <button type="button" onClick={onRemoved} className="text-rose-700">
          حذف
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          type="text"
          dir="ltr"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              apply();
            }
          }}
          placeholder="کد تخفیف"
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-charcoal focus:border-rose-400 focus:outline-none"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={submitting || !code.trim()}
          onClick={apply}
          className="shrink-0 px-4"
        >
          {submitting ? "..." : "اعمال"}
        </Button>
      </div>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
