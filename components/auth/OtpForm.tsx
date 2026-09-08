"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function OtpForm({ phone, redirectTo }: { phone: string; redirectTo: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setResendMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }
      setResendMessage("کد جدید ارسال شد.");
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold text-charcoal">کد تایید را وارد کنید</h1>
        <p className="text-sm text-charcoal-muted">
          کد ۵ رقمی ارسال‌شده به شماره{" "}
          <span dir="ltr" className="font-medium text-charcoal">
            {phone}
          </span>{" "}
          را وارد کنید.
        </p>
      </div>

      <div className="space-y-2">
        <input
          id="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={5}
          dir="ltr"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-center text-2xl tracking-[0.5em] text-charcoal focus:border-rose-400 focus:outline-none"
          required
        />
        {error ? <p className="text-center text-sm text-rose-700">{error}</p> : null}
        {resendMessage ? (
          <p className="text-center text-sm text-charcoal-muted">{resendMessage}</p>
        ) : null}
      </div>

      <Button type="submit" size="lg" disabled={loading || code.length !== 5} className="w-full">
        {loading ? "در حال بررسی…" : "تایید"}
      </Button>

      <button
        type="button"
        onClick={handleResend}
        disabled={resending}
        className="text-sm text-rose-600 underline-offset-4 hover:underline disabled:opacity-50"
      >
        {resending ? "در حال ارسال…" : "ارسال دوباره‌ی کد"}
      </button>
    </form>
  );
}
