"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function ConfirmDeliveryButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/deliver`, { method: "POST" });
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
    <div className="space-y-2">
      <Button size="lg" className="w-full" disabled={submitting} onClick={handleClick}>
        {submitting ? "در حال ثبت…" : "سفارش رو دریافت کردم"}
      </Button>
      {error ? <p className="text-center text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
