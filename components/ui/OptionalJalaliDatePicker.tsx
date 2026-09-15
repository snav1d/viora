"use client";

import { X, CalendarPlus } from "lucide-react";
import { JalaliDatePicker } from "@/components/ui/JalaliDatePicker";
import { todayIso } from "@/lib/jalali";

/// A nullable wrapper around JalaliDatePicker, for fields like a coupon's start/end date
/// (docs/decisions.md ADR 35) that are genuinely optional - unlike the print flow's delivery
/// date, which always has a real value once express is chosen. Shows an "افزودن تاریخ" affordance
/// while unset, and a "×" to clear back to unset once a date is picked.
export function OptionalJalaliDatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (iso: string | null) => void;
}) {
  if (value === null) {
    return (
      <button
        type="button"
        onClick={() => onChange(todayIso())}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-charcoal-muted hover:border-rose-300"
      >
        <CalendarPlus className="h-4 w-4" strokeWidth={1.75} />
        {label}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <JalaliDatePicker value={value} onChange={onChange} />
      </div>
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-label="حذف تاریخ"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-charcoal-muted hover:bg-rose-50"
      >
        <X className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
