"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/// Shown only to the admin currently previewing a theme (app/layout.tsx renders it exactly when
/// lib/data/theme.ts's getEffectiveTheme reports isPreview) - never to other visitors, since the
/// underlying cookie only takes effect for requests that also pass requireAdmin(). Lets them exit
/// back to whatever theme is actually live today without hunting for the admin panel.
export function ThemePreviewBanner({ themeName }: { themeName: string }) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  async function exitPreview() {
    setExiting(true);
    try {
      await fetch("/api/admin/themes/preview", { method: "DELETE" });
      router.refresh();
    } finally {
      setExiting(false);
    }
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-2 bg-charcoal px-4 py-2 text-xs text-warm-white">
      <span>در حال پیش‌نمایش تم «{themeName}» — فقط شما این پالت را می‌بینید.</span>
      <button
        type="button"
        onClick={exitPreview}
        disabled={exiting}
        className="flex shrink-0 items-center gap-1 rounded-full bg-warm-white/15 px-3 py-1 disabled:opacity-50"
      >
        <X className="h-3 w-3" strokeWidth={2} />
        خروج
      </button>
    </div>
  );
}
