"use client";

import { useState } from "react";
import { Eye } from "lucide-react";

/// Sets this admin's preview cookie for the given theme, then opens the site's home page in a
/// new tab - the cookie applies to every route (app/layout.tsx wraps the whole site), but home is
/// the most representative page to land on for a first look. See docs/decisions.md ADR 36.
export function ThemePreviewButton({ themeId }: { themeId: string }) {
  const [pending, setPending] = useState(false);

  async function startPreview() {
    setPending(true);
    try {
      const response = await fetch(`/api/admin/themes/${themeId}/preview`, { method: "POST" });
      if (response.ok) {
        window.open("/home", "_blank", "noopener,noreferrer");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={startPreview}
      disabled={pending}
      className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-charcoal-muted hover:bg-rose-50 disabled:opacity-50"
    >
      <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
      پیش‌نمایش
    </button>
  );
}
