"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const inputClass =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-charcoal focus:border-rose-400 focus:outline-none";

export function SellerRegisterForm({
  cities,
  categories,
}: {
  cities: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [cityId, setCityId] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [bankAccountIban, setBankAccountIban] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/seller/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          description: description || undefined,
          categoryId,
          cityId,
          nationalId,
          bankAccountIban,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }

      router.push("/seller");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-6 py-6">
      <p className="text-sm text-charcoal-muted">
        بعد از ثبت درخواست، حساب شما در انتظار تایید قرار می‌گیرد.
      </p>

      <div className="space-y-1.5">
        <label htmlFor="businessName" className="text-sm font-medium text-charcoal">
          نام فروشگاه
        </label>
        <input
          id="businessName"
          type="text"
          required
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium text-charcoal">
          توضیحات فروشگاه
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="categoryId" className="text-sm font-medium text-charcoal">
          دسته‌بندی اصلی
        </label>
        <select
          id="categoryId"
          required
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className={inputClass}
        >
          <option value="" disabled>
            انتخاب کنید…
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cityId" className="text-sm font-medium text-charcoal">
          شهر
        </label>
        <select
          id="cityId"
          required
          value={cityId}
          onChange={(event) => setCityId(event.target.value)}
          className={inputClass}
        >
          <option value="" disabled>
            انتخاب کنید…
          </option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="nationalId" className="text-sm font-medium text-charcoal">
          کد ملی / شناسه صنفی
        </label>
        <input
          id="nationalId"
          type="text"
          inputMode="numeric"
          dir="ltr"
          required
          value={nationalId}
          onChange={(event) => setNationalId(event.target.value.replace(/\D/g, ""))}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bankAccountIban" className="text-sm font-medium text-charcoal">
          شماره شبا (با IR)
        </label>
        <input
          id="bankAccountIban"
          type="text"
          dir="ltr"
          placeholder="IR000000000000000000000000"
          required
          value={bankAccountIban}
          onChange={(event) => setBankAccountIban(event.target.value.toUpperCase())}
          className={inputClass}
        />
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <Button type="submit" size="lg" disabled={submitting} className="mt-2 w-full">
        {submitting ? "در حال ارسال…" : "ثبت درخواست"}
      </Button>
    </form>
  );
}
