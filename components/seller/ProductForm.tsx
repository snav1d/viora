"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";

const inputClass =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-charcoal focus:border-rose-400 focus:outline-none";

// Persian-keyboard mobile input commonly types ۰-۹, which plain Number()/parseInt() don't
// recognize - normalize to ASCII digits before parsing anything a user typed. Same convention as
// the wizard's budget field (docs/decisions.md ADR 26).
function toEnglishDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function digitsOnly(value: string): string {
  return toEnglishDigits(value).replace(/[^\d]/g, "");
}

type ProductInput = {
  id: string;
  title: string;
  description: string | null;
  categoryId: string;
  cityId: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  images: string[];
  isActive: boolean;
};

export function ProductForm({
  cities,
  categories,
  product,
}: {
  cities: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  product?: ProductInput;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [cityId, setCityId] = useState(product?.cityId ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [discountPrice, setDiscountPrice] = useState(
    product?.discountPrice ? String(product.discountPrice) : "",
  );
  const [stock, setStock] = useState(product ? String(product.stock) : "0");
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setError(null);
    setUploading(true);
    try {
      for (const file of files.slice(0, 6 - images.length)) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/seller/uploads", { method: "POST", body: formData });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "بارگذاری تصویر ناموفق بود.");
          break;
        }
        setImages((current) => [...current, data.url as string]);
      }
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    setImages((current) => current.filter((image) => image !== url));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(
        product ? `/api/seller/products/${product.id}` : "/api/seller/products",
        {
          method: product ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description: description || undefined,
            categoryId,
            cityId,
            price: Number(price || "0"),
            discountPrice: discountPrice ? Number(discountPrice) : null,
            stock: Number(stock || "0"),
            images,
            isActive,
          }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }

      router.push("/seller/products");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-6 py-6">
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium text-charcoal">
          عنوان محصول
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium text-charcoal">
          توضیحات
        </label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="categoryId" className="text-sm font-medium text-charcoal">
          دسته‌بندی
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="price" className="text-sm font-medium text-charcoal">
            قیمت (تومان)
          </label>
          <input
            id="price"
            type="text"
            inputMode="numeric"
            required
            value={price ? Number(price).toLocaleString("fa-IR") : ""}
            onChange={(event) => setPrice(digitsOnly(event.target.value))}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="stock" className="text-sm font-medium text-charcoal">
            موجودی
          </label>
          <input
            id="stock"
            type="text"
            inputMode="numeric"
            required
            value={stock ? Number(stock).toLocaleString("fa-IR") : ""}
            onChange={(event) => setStock(digitsOnly(event.target.value))}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="discountPrice" className="text-sm font-medium text-charcoal">
          قیمت با تخفیف (اختیاری)
        </label>
        <input
          id="discountPrice"
          type="text"
          inputMode="numeric"
          value={discountPrice ? Number(discountPrice).toLocaleString("fa-IR") : ""}
          onChange={(event) => setDiscountPrice(digitsOnly(event.target.value))}
          placeholder="خالی بگذارید تا بدون تخفیف باشد"
          className={inputClass}
        />
        {discountPrice && price && Number(discountPrice) >= Number(price) ? (
          <p className="text-xs text-rose-700">قیمت با تخفیف باید کمتر از قیمت اصلی باشد.</p>
        ) : (
          <p className="text-xs text-charcoal-muted">
            اگر تنظیم کنید، در فروشگاه قیمت اصلی خط‌خورده و این قیمت نمایش داده می‌شود.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium text-charcoal">تصاویر محصول</span>
        <div className="flex flex-wrap gap-2">
          {images.map((url) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URLs, not a local /public asset next/image can optimize */}
              <img src={url} alt="پیش‌نمایش تصویر محصول" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                aria-label="حذف تصویر"
                className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-charcoal/70 text-warm-white"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            </div>
          ))}
          {images.length < 6 ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-charcoal-muted disabled:opacity-50"
            >
              <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-[10px]">{uploading ? "در حال بارگذاری…" : "افزودن"}</span>
            </button>
          ) : null}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFilesSelected}
          className="hidden"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-charcoal">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        نمایش در فروشگاه (فعال)
      </label>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <Button
        type="submit"
        size="lg"
        disabled={
          submitting ||
          uploading ||
          (discountPrice !== "" && price !== "" && Number(discountPrice) >= Number(price))
        }
        className="mt-2 w-full"
      >
        {submitting ? "در حال ذخیره…" : product ? "ذخیره تغییرات" : "افزودن محصول"}
      </Button>
    </form>
  );
}
