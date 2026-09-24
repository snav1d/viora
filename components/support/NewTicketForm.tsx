"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const inputClass =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-charcoal focus:border-charcoal focus:outline-none";

export function NewTicketForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }
      router.push(`/support/${data.ticketId}`);
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 px-6 py-6">
      <div className="space-y-1.5">
        <label htmlFor="subject" className="text-sm font-medium text-charcoal">
          موضوع
        </label>
        <input
          id="subject"
          type="text"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="message" className="text-sm font-medium text-charcoal">
          پیام
        </label>
        <textarea
          id="message"
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={inputClass}
        />
      </div>

      {error ? <p className="text-center text-sm text-error-500">{error}</p> : null}

      <div className="mt-auto">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting || !subject.trim() || !message.trim()}
        >
          {submitting ? "در حال ارسال…" : "ارسال تیکت"}
        </Button>
      </div>
    </form>
  );
}
