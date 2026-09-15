"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

export function TicketReplyForm({ endpoint }: { endpoint: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }
      setBody("");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="پیام خود را بنویسید…"
          rows={2}
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-charcoal focus:border-rose-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          aria-label="ارسال"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-500 text-charcoal disabled:opacity-40"
        >
          <Send className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
