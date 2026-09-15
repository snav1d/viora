"use client";

import { useEffect, useRef, useState } from "react";
import { toGregorian } from "jalaali-js";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  PERSIAN_MONTHS,
  PERSIAN_WEEKDAY_LABELS,
  formatJalaliLong,
  isoToJalali,
  jalaliMonthLength,
  jalaliToIso,
  toPersianDigits,
} from "@/lib/jalali";

/// A native <input type="date"> always renders the Gregorian calendar regardless of locale -
/// this replaces it with a real Jalali picker for the one place in this app that needs someone
/// to *choose* a future date, not just read one back. See docs/decisions.md ADR 32.
export function JalaliDatePicker({
  value,
  onChange,
  minIso,
}: {
  value: string;
  onChange: (iso: string) => void;
  minIso: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = isoToJalali(value);
  const min = isoToJalali(minIso);
  const [viewJy, setViewJy] = useState(selected.jy);
  const [viewJm, setViewJm] = useState(selected.jm);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function openPicker() {
    setViewJy(selected.jy);
    setViewJm(selected.jm);
    setOpen(true);
  }

  function goPrevMonth() {
    setViewJm((m) => {
      if (m === 1) {
        setViewJy((y) => y - 1);
        return 12;
      }
      return m - 1;
    });
  }

  function goNextMonth() {
    setViewJm((m) => {
      if (m === 12) {
        setViewJy((y) => y + 1);
        return 1;
      }
      return m + 1;
    });
  }

  const isPrevDisabled = viewJy < min.jy || (viewJy === min.jy && viewJm <= min.jm);

  const monthLength = jalaliMonthLength(viewJy, viewJm);
  const { gy: firstGy, gm: firstGm, gd: firstGd } = toGregorian(viewJy, viewJm, 1);
  const leadingBlanks = (new Date(firstGy, firstGm - 1, firstGd).getDay() + 1) % 7;
  const days = Array.from({ length: monthLength }, (_, i) => i + 1);

  function isBeforeMin(jy: number, jm: number, jd: number): boolean {
    if (jy !== min.jy) return jy < min.jy;
    if (jm !== min.jm) return jm < min.jm;
    return jd < min.jd;
  }

  function selectDay(day: number) {
    onChange(jalaliToIso(viewJy, viewJm, day));
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-charcoal focus:border-rose-400 focus:outline-none"
      >
        <span>{formatJalaliLong(value)}</span>
        <CalendarDays className="h-4 w-4 text-charcoal-muted" strokeWidth={1.75} />
      </button>

      {open ? (
        <div className="absolute z-20 mt-2 w-full rounded-2xl border border-border bg-surface p-3 shadow-lg">
          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              onClick={goNextMonth}
              aria-label="ماه بعد"
              className="flex h-8 w-8 items-center justify-center rounded-full text-charcoal-muted hover:bg-rose-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-medium text-charcoal">
              {PERSIAN_MONTHS[viewJm - 1]} {toPersianDigits(viewJy)}
            </p>
            <button
              type="button"
              onClick={goPrevMonth}
              disabled={isPrevDisabled}
              aria-label="ماه قبل"
              className="flex h-8 w-8 items-center justify-center rounded-full text-charcoal-muted hover:bg-rose-50 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-charcoal-muted">
            {PERSIAN_WEEKDAY_LABELS.map((label, i) => (
              <span key={i} className="py-1">
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {Array.from({ length: leadingBlanks }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {days.map((day) => {
              const disabled = isBeforeMin(viewJy, viewJm, day);
              const isSelected = viewJy === selected.jy && viewJm === selected.jm && day === selected.jd;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(day)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                    disabled
                      ? "text-charcoal-muted/40"
                      : isSelected
                        ? "bg-gold-500 text-charcoal"
                        : "text-charcoal hover:bg-rose-50",
                  )}
                >
                  {toPersianDigits(day)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
