"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OptionalJalaliDatePicker } from "@/components/ui/OptionalJalaliDatePicker";
import { BANNER_PLACEMENT_LABELS } from "@/lib/labels";

const inputClass =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-charcoal focus:border-rose-400 focus:outline-none";

type BannerInput = {
  id: string;
  imageUrl: string;
  text: string;
  link: string | null;
  placement: "HOME_TOP";
  startsAt: string | null;
  endsAt: string | null;
};

export function BannerForm({ banner }: { banner?: BannerInput }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageUrl, setImageUrl] = useState(banner?.imageUrl ?? "");
  const [text, setText] = useState(banner?.text ?? "");
  const [link, setLink] = useState(banner?.link ?? "");
  const [startsAt, setStartsAt] = useState<string | null>(banner?.startsAt ?? null);
  const [endsAt, setEndsAt] = useState<string | null>(banner?.endsAt ?? null);

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/banners/uploads", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "بارگذاری تصویر ناموفق بود.");
        return;
      }
      setImageUrl(data.url as string);
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!imageUrl) {
      setError("تصویر بنر را آپلود کنید.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(banner ? `/api/admin/banners/${banner.id}` : "/api/admin/banners", {
        method: banner ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          text,
          link: link.trim() ? link.trim() : null,
          placement: "HOME_TOP",
          startsAt,
          endsAt,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }
      router.push("/admin/banners");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-6 py-6">
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-charcoal">تصویر بنر</p>
        {imageUrl ? (
          <div className="relative h-32 w-full overflow-hidden rounded-2xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URLs, not a local /public asset next/image can optimize */}
            <img src={imageUrl} alt="پیش‌نمایش بنر" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => setImageUrl("")}
              aria-label="حذف تصویر"
              className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-charcoal/70 text-warm-white"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border text-charcoal-muted hover:border-rose-300"
          >
            <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-xs">{uploading ? "در حال بارگذاری…" : "افزودن تصویر"}</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelected}
          className="hidden"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="text" className="text-sm font-medium text-charcoal">
          متن بنر
        </label>
        <input
          id="text"
          type="text"
          required
          value={text}
          onChange={(event) => setText(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="link" className="text-sm font-medium text-charcoal">
          لینک (اختیاری)
        </label>
        <input
          id="link"
          type="text"
          dir="ltr"
          placeholder="/shop یا https://…"
          value={link}
          onChange={(event) => setLink(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-charcoal">جایگاه</p>
        <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-charcoal-muted">
          {BANNER_PLACEMENT_LABELS.HOME_TOP}
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-charcoal">تاریخ شروع (اختیاری)</p>
        <OptionalJalaliDatePicker label="افزودن تاریخ شروع" value={startsAt} onChange={setStartsAt} />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-charcoal">تاریخ پایان (اختیاری)</p>
        <OptionalJalaliDatePicker label="افزودن تاریخ پایان" value={endsAt} onChange={setEndsAt} />
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <Button type="submit" size="lg" disabled={submitting || uploading} className="mt-2 w-full">
        {submitting ? "در حال ذخیره…" : banner ? "ذخیره تغییرات" : "افزودن بنر"}
      </Button>
    </form>
  );
}
