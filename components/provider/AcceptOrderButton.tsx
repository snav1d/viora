"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function AcceptOrderButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/provider/orders/${itemId}/accept`, { method: "POST" });
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
      <Button size="lg" className="w-full" onClick={handleAccept} disabled={loading}>
        {loading ? "در حال پذیرش…" : "پذیرش سفارش"}
      </Button>
      {error ? <p className="text-xs text-error-500">{error}</p> : null}
    </div>
  );
}
