"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/// Full-screen scrollable gallery for a provider's "پورتفولیو" (docs/decisions.md ADR 43) -
/// shared by every partner-selection surface (print, and any future service category) so
/// "مشاهده‌ی نمونه‌کار" always looks the same regardless of which page opened it.
export function PortfolioGalleryModal({
  businessName,
  images,
  onClose,
}: {
  businessName: string;
  images: string[];
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-charcoal/80 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="font-medium text-warm-white">نمونه‌کارهای {businessName}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="بستن"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-warm-white/10 text-warm-white hover:bg-warm-white/20"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {images.length === 0 ? (
          <p className="py-10 text-center text-sm text-warm-white/80">این پارتنر هنوز نمونه‌کاری اضافه نکرده است.</p>
        ) : (
          <div className="mx-auto flex max-w-md flex-col gap-3">
            {images.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URLs, not a local /public asset next/image can optimize
              <img
                key={url}
                src={url}
                alt="نمونه‌کار"
                className="w-full rounded-2xl border border-warm-white/10 object-cover"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
