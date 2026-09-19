"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function RequestReassignmentButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest() {
    if (!window.confirm("این سفارش برای پذیرش توسط پارتنرهای دیگر در دسترس قرار می‌گیرد. ادامه می‌دهید؟")) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/provider/orders/${itemId}/request-reassignment`, {
        method: "POST",
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
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="md" variant="secondary" className="w-full" onClick={handleRequest} disabled={loading}>
        {loading ? "در حال ثبت…" : "درخواست واگذاری سفارش"}
      </Button>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
