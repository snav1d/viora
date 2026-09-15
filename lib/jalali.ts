import { toJalaali, toGregorian, jalaaliMonthLength } from "jalaali-js";

/// Everywhere else in this app, a Persian-calendar date is just for *display* and Intl's own
/// `toLocaleDateString("fa-IR")` already converts correctly (Node/browser ICU has full Jalali
/// support - verified directly). This module exists for the one thing Intl can't do: a native
/// HTML `<input type="date">` always renders the Gregorian calendar regardless of locale, so a
/// real date *picker* needs its own Jalali<->Gregorian conversion. See docs/decisions.md ADR 32.

export const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
] as const;

/// Persian week starts Saturday, per jalaaliWeek's own convention.
export const PERSIAN_WEEKDAY_LABELS = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toPersianDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export type JalaliDate = { jy: number; jm: number; jd: number };

export function isoToJalali(iso: string): JalaliDate {
  const [gy, gm, gd] = iso.split("-").map(Number);
  return toJalaali(gy, gm, gd);
}

export function jalaliToIso(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  return `${gy}-${pad(gm)}-${pad(gd)}`;
}

export function jalaliMonthLength(jy: number, jm: number): number {
  return jalaaliMonthLength(jy, jm);
}

/// "۲۸ شهریور ۱۴۰۵"
export function formatJalaliLong(iso: string): string {
  const { jy, jm, jd } = isoToJalali(iso);
  return `${toPersianDigits(jd)} ${PERSIAN_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
}

/// "۲۵ شهریور تا ۲۸ شهریور ۱۴۰۵" - year is shown once, on the later date, unless the range
/// happens to cross a Jalali year boundary, where both need their own year to stay unambiguous.
export function formatJalaliRange(fromIso: string, toIso: string): string {
  const from = isoToJalali(fromIso);
  const to = isoToJalali(toIso);
  const fromLabel =
    from.jy === to.jy
      ? `${toPersianDigits(from.jd)} ${PERSIAN_MONTHS[from.jm - 1]}`
      : `${toPersianDigits(from.jd)} ${PERSIAN_MONTHS[from.jm - 1]} ${toPersianDigits(from.jy)}`;
  const toLabel = `${toPersianDigits(to.jd)} ${PERSIAN_MONTHS[to.jm - 1]} ${toPersianDigits(to.jy)}`;
  return `${fromLabel} تا ${toLabel}`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
