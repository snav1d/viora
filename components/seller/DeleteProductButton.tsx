"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteProductButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("این محصول برای همیشه حذف می‌شود. ادامه می‌دهید؟")) return;

    setError(null);
    setDeleting(true);
    try {
      const response = await fetch(`/api/seller/listings/${listingId}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "حذف محصول ناموفق بود.");
        return;
      }

      router.push("/seller/products");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 px-6">
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-rose-200 py-3 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
        {deleting ? "در حال حذف…" : "حذف محصول"}
      </button>
      {error ? <p className="text-xs text-error-500">{error}</p> : null}
    </div>
  );
}
