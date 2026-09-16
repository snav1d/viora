"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

/// The admin hub queue's final action on a QUALITY_CHECK item: register the real customer-facing
/// tracking code and ship it (docs/decisions.md ADR 37) - required here, unlike the seller's own
/// optional tracking code on a direct-ship item, since this is the only tracking code the
/// customer will ever see for a hub item.
export function FinalizeHubItemForm({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [trackingCode, setTrackingCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/hub-items/${itemId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingCode }),
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
        required
        placeholder="کد رهگیری نهایی"
        value={trackingCode}
        onChange={(event) => setTrackingCode(event.target.value)}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-charcoal focus:border-rose-400 focus:outline-none"
      />
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
      <Button type="submit" size="md" disabled={submitting} className="w-full">
        {submitting ? "در حال ثبت…" : "تایید کنترل کیفیت و ارسال نهایی"}
      </Button>
    </form>
  );
}
