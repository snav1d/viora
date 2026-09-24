"use client";

import { useRef, useState } from "react";
import { X, ImagePlus } from "lucide-react";

/// Shared by every service-provider registration wizard (print and every "simple" category
/// alike, docs/decisions.md ADR 44) - a minimum number of work-sample photos is now mandatory
/// before submitting a registration at all, not just an optional post-approval panel feature.
/// These same uploaded URLs become the provider's initial ProviderPortfolioImage rows the moment
/// their registration is submitted (invisible publicly until admin approval either way, since
/// every public listing already filters on provider.status === "APPROVED").
export function PortfolioUploadStep({
  images,
  onChange,
  minImages,
}: {
  images: string[];
  onChange: (urls: string[]) => void;
  minImages: number;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setError(null);
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/provider/register/uploads", { method: "POST", body: formData });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "بارگذاری تصویر ناموفق بود.");
          break;
        }
        uploaded.push(data.url as string);
      }
      if (uploaded.length > 0) onChange([...images, ...uploaded]);
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    onChange(images.filter((image) => image !== url));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-charcoal">نمونه‌کارها</p>
        <p className="text-xs text-charcoal-muted">
          {images.length.toLocaleString("fa-IR")} از حداقل {minImages.toLocaleString("fa-IR")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {images.map((url) => (
          <div key={url} className="relative h-24 w-24 overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URLs, not a local /public asset next/image can optimize */}
            <img src={url} alt="نمونه‌کار" className="h-full w-full object-cover" />
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
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-charcoal-muted disabled:opacity-50"
        >
          <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
          <span className="text-[10px]">{uploading ? "در حال بارگذاری…" : "افزودن"}</span>
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFilesSelected}
        className="hidden"
      />

      {error ? <p className="text-xs text-error-500">{error}</p> : null}
      <p className="text-xs text-charcoal-muted">
        حداقل {minImages.toLocaleString("fa-IR")} نمونه از بهترین کارهای قبلی‌تان را اضافه کنید - این
        تصاویر بعد از تایید، پورتفولیوی اولیه‌ی شما در پنل می‌شوند (بعداً هم قابل‌ویرایش/حذف است).
      </p>
    </div>
  );
}
