/** Normalizes common Iranian mobile input variants to the canonical "09XXXXXXXXX" form. */
export function normalizeIranianPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");

  let normalized: string | null = null;
  if (/^09\d{9}$/.test(digits)) {
    normalized = digits;
  } else if (/^989\d{9}$/.test(digits)) {
    normalized = `0${digits.slice(2)}`;
  } else if (/^00989\d{9}$/.test(digits)) {
    normalized = `0${digits.slice(4)}`;
  } else if (/^9\d{9}$/.test(digits)) {
    normalized = `0${digits}`;
  }

  return normalized;
}

export function isValidIranianPhone(raw: string): boolean {
  return normalizeIranianPhone(raw) !== null;
}

/**
 * A shop's own contact number (seller registration's "شماره‌های تماس") is reasonably a landline,
 * not just a mobile number the way OTP login requires - normalizeIranianPhone()/
 * isValidIranianPhone() above are mobile-only and would wrongly reject a real business landline
 * like "021XXXXXXXX". Accepts any 10-11 digit Iranian number starting with 0 (mobile
 * 09XXXXXXXXX, or a landline with its area code). See docs/decisions.md ADR 29.
 */
export function normalizeIranianContactNumber(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  return /^0\d{9,10}$/.test(digits) ? digits : null;
}
