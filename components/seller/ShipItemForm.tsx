"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-charcoal focus:border-charcoal focus:outline-none";

export function ShipItemForm({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [trackingCode, setTrackingCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/seller/orders/${itemId}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingCode: trackingCode.trim() || undefined }),
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
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="text"
        dir="ltr"
        placeholder="کد رهگیری (اختیاری)"
        value={trackingCode}
        onChange={(event) => setTrackingCode(event.target.value)}
        className={inputClass}
      />
      {error ? <p className="text-xs text-error-500">{error}</p> : null}
      <Button type="submit" size="md" disabled={submitting} className="w-full">
        {submitting ? "در حال ثبت…" : "ثبت ارسال"}
      </Button>
    </form>
  );
}
