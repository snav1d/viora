"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

type PrintColor = { id: string; name: string };

export function PrintColorManager({ colors }: { colors: PrintColor[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addColor() {
    if (!name.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/print-colors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }
      setName("");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeColor(id: string) {
    setError(null);
    setRemovingId(id);
    try {
      const response = await fetch(`/api/admin/print-colors/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addColor();
            }
          }}
          placeholder="مثلاً قرمز"
          className="w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-charcoal focus:border-charcoal focus:outline-none"
        />
        <Button
          type="button"
          variant="secondary"
          size="md"
          disabled={submitting}
          onClick={addColor}
          className="shrink-0 px-4"
        >
          افزودن
        </Button>
      </div>
      {error ? <p className="text-xs text-error-500">{error}</p> : null}
      {colors.length === 0 ? (
        <p className="text-sm text-charcoal-muted">هنوز رنگی ثبت نشده است.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => (
            <span
              key={color.id}
              className="flex items-center gap-1.5 rounded-full border border-border bg-warm-white px-3 py-1.5 text-sm text-charcoal"
            >
              {color.name}
              <button
                type="button"
                onClick={() => removeColor(color.id)}
                disabled={removingId === color.id}
                aria-label={`حذف ${color.name}`}
                className="disabled:opacity-40"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
