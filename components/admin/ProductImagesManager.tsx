"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ImagePlus } from "lucide-react";

const MAX_IMAGES = 6;

/// Every add/remove PATCHes the full images array to the server immediately (no separate "save"
/// step, same UX as PortfolioManager) - unlike PortfolioManager's own per-image rows, here the
/// whole list lives in one Product.images JSON field, so a change means resubmitting the array,
/// not creating/deleting a row. Shown unconditionally on the admin product detail page regardless
/// of status - an admin fixing an old imageless catalog entry shouldn't need it back in
/// PENDING_REVIEW first.
export function ProductImagesManager({
  productId,
  initialImages,
}: {
  productId: string;
  initialImages: string[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persist(next: string[]) {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: next }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }
      setImages(next);
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setError(null);
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files.slice(0, MAX_IMAGES - images.length)) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/admin/products/uploads", { method: "POST", body: formData });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "بارگذاری تصویر ناموفق بود.");
          break;
        }
        uploaded.push(data.url as string);
      }
      if (uploaded.length > 0) await persist([...images, ...uploaded]);
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    persist(images.filter((image) => image !== url));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-charcoal">تصاویر محصول</p>
        <p className="text-xs text-charcoal-muted">
          {images.length.toLocaleString("fa-IR")} از {MAX_IMAGES.toLocaleString("fa-IR")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {images.map((url) => (
          <div key={url} className="relative h-24 w-24 overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URLs, not a local /public asset next/image can optimize */}
            <img src={url} alt="تصویر محصول" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(url)}
              disabled={saving}
              aria-label="حذف تصویر"
              className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-charcoal/70 text-warm-white disabled:opacity-50"
            >
              <X className="h-3 w-3" strokeWidth={2} />
            </button>
          </div>
        ))}
        {images.length < MAX_IMAGES ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || saving}
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
          این محصول هنوز عکسی ندارد — از دکمه‌ی «افزودن» یک یا چند تصویر اضافه کنید.
        </p>
      ) : null}
    </div>
  );
}
