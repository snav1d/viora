"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

/// A MULTI_SELLER order item's ship action (docs/decisions.md ADR 37) - no tracking-code input,
/// since the destination is the Viora hub, not the customer.
export function SendToHubButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/seller/orders/${itemId}/send-to-hub`, { method: "POST" });
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
    <div className="flex flex-col gap-1">
      <Button size="md" className="w-full" onClick={handleClick} disabled={submitting}>
        {submitting ? "در حال ثبت…" : "ارسال به مرکز ویورا"}
      </Button>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
