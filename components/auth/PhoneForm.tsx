"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function PhoneForm({ redirectTo }: { redirectTo: string }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

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

      const verifyUrl = `/auth/verify?phone=${encodeURIComponent(data.phone)}&redirect=${encodeURIComponent(redirectTo)}`;
      router.push(verifyUrl);
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold text-charcoal">ورود یا ثبت‌نام</h1>
        <p className="text-sm text-charcoal-muted">
          شماره موبایل خود را وارد کنید تا کد تایید برایتان پیامک شود.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-medium text-charcoal">
          شماره موبایل
        </label>
        <input
          id="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="09xxxxxxxxx"
          dir="ltr"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-center text-lg tracking-wider text-charcoal placeholder:text-charcoal-muted/50 focus:border-rose-400 focus:outline-none"
          required
        />
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </div>

      <Button type="submit" size="lg" disabled={loading} className="w-full">
        {loading ? "در حال ارسال…" : "ارسال کد تایید"}
      </Button>
    </form>
  );
}
