/// The full set of CSS custom-property tokens app/globals.css's `@theme` block defines for the
/// default Champagne Rose skin. A SeasonalTheme.palette (docs/decisions.md ADR 36) is always a
/// complete replacement map over exactly these keys - never a sparse override - so there's no
/// merge logic and no question of what a partially-specified theme falls back to.
export const CHAMPAGNE_ROSE_PALETTE: Record<string, string> = {
  "warm-white": "#faf6f2",
  surface: "#ffffff",

  "rose-50": "#fbf0f1",
  "rose-100": "#f3dee0",
  "rose-200": "#eaccd0",
  "rose-300": "#dfb2b7",
  "rose-400": "#d29ba1",
  "rose-500": "#c98a93",
  "rose-600": "#b06e78",
  "rose-700": "#8f5760",

  "gold-100": "#f6ecd3",
  "gold-200": "#ecdcae",
  "gold-300": "#ddbe84",
  "gold-400": "#d0ac68",
  "gold-500": "#c6a15b",
  "gold-600": "#a9803f",

  charcoal: "#2b2320",
  "charcoal-muted": "#766a63",
  border: "#ece3dc",
};

export const PALETTE_TOKEN_LABELS: Record<string, string> = {
  "warm-white": "پس‌زمینه‌ی اصلی",
  surface: "سطح کارت‌ها",

  "rose-50": "صورتی ۵۰ (خیلی روشن)",
  "rose-100": "صورتی ۱۰۰",
  "rose-200": "صورتی ۲۰۰",
  "rose-300": "صورتی ۳۰۰",
  "rose-400": "صورتی ۴۰۰",
  "rose-500": "صورتی ۵۰۰ (اصلی)",
  "rose-600": "صورتی ۶۰۰",
  "rose-700": "صورتی ۷۰۰ (تیره)",

  "gold-100": "طلایی ۱۰۰",
  "gold-200": "طلایی ۲۰۰",
  "gold-300": "طلایی ۳۰۰",
  "gold-400": "طلایی ۴۰۰",
  "gold-500": "طلایی ۵۰۰ (دکمه‌های اصلی)",
  "gold-600": "طلایی ۶۰۰",

  charcoal: "متن اصلی",
  "charcoal-muted": "متن کم‌رنگ",
  border: "خط دور عناصر",
};

export const PALETTE_TOKENS = Object.keys(CHAMPAGNE_ROSE_PALETTE);

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function isValidPalette(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return PALETTE_TOKENS.every(
    (token) => typeof record[token] === "string" && HEX_COLOR_PATTERN.test(record[token] as string),
  );
}

/// Converts a palette map into the inline `style` object applied to <html> in app/layout.tsx -
/// React passes CSS custom-property keys (containing a hyphen) through as-is rather than
/// camelCasing them, so `--color-rose-500` works directly as a style object key.
export function paletteToCssVars(palette: Record<string, string>): Record<string, string> {
  return Object.fromEntries(PALETTE_TOKENS.map((token) => [`--color-${token}`, palette[token]]));
}
