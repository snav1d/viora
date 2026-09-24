"use client";

import { useRef, useState } from "react";
import { X, ImagePlus } from "lucide-react";

type PortfolioImage = { id: string; imageUrl: string };

/// Each thumbnail is its own persisted row (unlike ProductForm's images[], which stays local
/// until the whole form submits) - upload immediately creates the ProviderPortfolioImage row, and
/// delete immediately removes it, since there's no separate "save" step for a portfolio (docs/
/// decisions.md ADR 43).
export function PortfolioManager({
  initialImages,
  maxImages,
}: {
  initialImages: PortfolioImage[];
  maxImages: number;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<PortfolioImage[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setError(null);
    setUploading(true);
    try {
      for (const file of files.slice(0, maxImages - images.length)) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadResponse = await fetch("/api/provider/portfolio/uploads", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) {
          setError(uploadData.error ?? "بارگذاری تصویر ناموفق بود.");
          break;
        }

        const createResponse = await fetch("/api/provider/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: uploadData.url }),
        });
        const createData = await createResponse.json();
        if (!createResponse.ok) {
          setError(createData.error ?? "افزودن تصویر ناموفق بود.");
          break;
        }
        setImages((current) => [...current, createData.image as PortfolioImage]);
      }
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(id: string) {
    setError(null);
    setDeletingId(id);
    try {
      const response = await fetch(`/api/provider/portfolio/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "حذف تصویر ناموفق بود.");
        return;
      }
      setImages((current) => current.filter((image) => image.id !== id));
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-charcoal">نمونه‌کارها</p>
        <p className="text-xs text-charcoal-muted">
          {images.length.toLocaleString("fa-IR")} از {maxImages.toLocaleString("fa-IR")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {images.map((image) => (
          <div key={image.id} className="relative h-24 w-24 overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URLs, not a local /public asset next/image can optimize */}
            <img src={image.imageUrl} alt="نمونه‌کار" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(image.id)}
              disabled={deletingId === image.id}
              aria-label="حذف تصویر"
              className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-charcoal/70 text-warm-white disabled:opacity-50"
            >
              <X className="h-3 w-3" strokeWidth={2} />
            </button>
          </div>
        ))}
        {images.length < maxImages ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-charcoal-muted disabled:opacity-50"
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

      {error ? <p className="text-sm text-error-500">{error}</p> : null}
      {images.length === 0 ? (
        <p className="text-xs text-charcoal-muted">
          چند نمونه از بهترین کارهای قبلی‌تان را اضافه کنید تا مشتری‌ها قبل از سفارش، کیفیت کارتان را ببینند.
        </p>
      ) : null}
    </div>
  );
}
