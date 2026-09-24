"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

/// The "درخواست مرجوعی" action on a delivered order item (docs/decisions.md ADR 38) - starts
/// collapsed as a plain button (same open/closed toggle UX as components/admin/RejectForm.tsx),
/// expands into a reason + optional single-photo form on click.
export function ReturnRequestForm({ orderItemId }: { orderItemId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [imageUrl, setImageUrl] = useState("");
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
      const response = await fetch("/api/support/tickets/uploads", { method: "POST", body: formData });
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
    setSubmitting(true);
    try {
      const response = await fetch("/api/support/tickets/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderItemId, reason, imageUrl: imageUrl || undefined }),
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 text-sm font-medium text-charcoal-muted hover:bg-rose-50"
      >
        <Undo2 className="h-4 w-4" strokeWidth={1.75} />
        درخواست مرجوعی
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-warm-white p-4"
    >
      <label htmlFor="reason" className="text-sm font-medium text-charcoal">
        دلیل مرجوعی
      </label>
      <textarea
        id="reason"
        rows={3}
        required
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-charcoal focus:border-charcoal focus:outline-none"
      />

      <p className="text-sm font-medium text-charcoal">عکس کالا (اختیاری)</p>
      {imageUrl ? (
        <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URL, not a local /public asset next/image can optimize */}
          <img src={imageUrl} alt="عکس کالا برای مرجوعی" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => setImageUrl("")}
            aria-label="حذف تصویر"
            className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-charcoal/70 text-warm-white"
          >
            <X className="h-3 w-3" strokeWidth={2} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-charcoal-muted hover:border-rose-300"
        >
          <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
          <span className="text-[10px]">{uploading ? "در حال بارگذاری…" : "افزودن"}</span>
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelected}
        className="hidden"
      />

      {error ? <p className="text-xs text-error-500">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" variant="secondary" className="flex-1" disabled={submitting || uploading}>
          {submitting ? "در حال ثبت…" : "ثبت درخواست مرجوعی"}
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-border px-4 text-sm text-charcoal-muted"
        >
          انصراف
        </button>
      </div>
    </form>
  );
}
