"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function ClaimOrderButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClaim() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/provider/orders/${itemId}/claim`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }
      router.push(`/provider/orders/${itemId}`);
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="md" className="w-full" onClick={handleClaim} disabled={loading}>
        {loading ? "در حال ثبت…" : "پذیرش این سفارش"}
      </Button>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
