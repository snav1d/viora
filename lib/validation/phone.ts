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
