"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function RejectForm({
  endpoint,
  triggerLabel = "رد درخواست",
  reasonLabel = "دلیل رد درخواست",
  submitLabel = "ثبت رد درخواست",
}: {
  endpoint: string;
  /// Overridable for reuse beyond a plain "reject" action (e.g. admin product review's "نیاز به
  /// بازبینی" - same shape, a required reason posted to a different endpoint - see
  /// docs/decisions.md ADR 39). Default copy keeps every existing caller unchanged.
  triggerLabel?: string;
  reasonLabel?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReject(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-full border border-rose-200 py-3 text-sm font-medium text-rose-700 hover:bg-rose-50"
      >
        {triggerLabel}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleReject}
      className="flex flex-col gap-2 rounded-2xl border border-rose-200 bg-rose-50/40 p-4"
    >
      <label htmlFor="reason" className="text-sm font-medium text-charcoal">
        {reasonLabel}
      </label>
      <textarea
        id="reason"
        rows={3}
        required
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-charcoal focus:border-rose-400 focus:outline-none"
      />
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" variant="secondary" className="flex-1" disabled={loading}>
          {loading ? "در حال ثبت…" : submitLabel}
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-border px-4 text-sm text-charcoal-muted"
        >
          انصراف
        </button>
      </div>
    </form>
  );
}
