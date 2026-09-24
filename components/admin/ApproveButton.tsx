"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function ApproveButton({
  endpoint,
  label,
  variant = "primary",
}: {
  endpoint: string;
  label: string;
  /// "secondary" for a plain POST action that isn't really an "approval" in tone (e.g. suspending
  /// a seller, docs/decisions.md ADR 38) - same component, just not the charcoal primary look.
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(endpoint, { method: "POST" });
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
      <Button size="lg" variant={variant} className="w-full" onClick={handleApprove} disabled={loading}>
        {loading ? "در حال ثبت…" : label}
      </Button>
      {error ? <p className="text-xs text-error-500">{error}</p> : null}
    </div>
  );
}
