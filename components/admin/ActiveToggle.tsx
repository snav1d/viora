"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

export function ActiveToggle({
  id,
  isActive,
  kind,
}: {
  id: string;
  isActive: boolean;
  kind: "cities" | "categories";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setError(null);
    setPending(true);
    try {
      const response = await fetch(`/api/admin/${kind}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
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
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        aria-label={isActive ? "غیرفعال کردن" : "فعال کردن"}
        onClick={handleToggle}
        disabled={pending}
        className={cn(
          "flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors disabled:opacity-50",
          isActive ? "justify-end bg-gold-500" : "justify-start bg-border",
        )}
      >
        <span className="h-5 w-5 rounded-full bg-surface shadow" />
      </button>
      {error ? <p className="text-[10px] text-rose-700">{error}</p> : null}
    </div>
  );
}
