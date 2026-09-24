/// The full set of CSS custom-property tokens app/globals.css's `@theme` block defines for the
/// default skin (docs/design-system.md - the visual-refresh redesign kept every token NAME
/// unchanged from the original Champagne Rose set, only their values/roles, specifically so an
/// admin-created SeasonalTheme.palette (docs/decisions.md ADR 36) never breaks). A SeasonalTheme
/// palette is always a complete replacement map over exactly these keys - never a sparse
/// override - so there's no merge logic and no question of what a partially-specified theme
/// falls back to. gold-50 was added here (it was already referenced as `bg-gold-50` in a few
/// components but never actually defined in either this map or globals.css - Tailwind v4 only
/// generates a utility for a color it can resolve, so those uses were silently producing no
/// background at all; now fixed and included in the swappable set like the rest of its family.
export const CHAMPAGNE_ROSE_PALETTE: Record<string, string> = {
  "warm-white": "#f4eee6",
  surface: "#ffffff",

  "rose-50": "#faf1ee",
  "rose-100": "#f3ded6",
  "rose-200": "#e9c9bc",
  "rose-300": "#dcac9b",
  "rose-400": "#cb9985",
  "rose-500": "#bc8570",
  "rose-600": "#a66f5a",
  "rose-700": "#8a5940",

  "gold-50": "#fbf4e7",
  "gold-100": "#f4e6c7",
  "gold-200": "#e9d6a8",
  "gold-300": "#d9be86",
  "gold-400": "#c7a667",
  "gold-500": "#b08f4e",
  "gold-600": "#8f7239",

  charcoal: "#211c19",
  "charcoal-muted": "#7a7068",
  border: "#e7dfd5",
};

export const PALETTE_TOKEN_LABELS: Record<string, string> = {
  "warm-white": "پس‌زمینه‌ی اصلی",
  surface: "سطح کارت‌ها",

  "rose-50": "صورتی خاکی ۵۰ (خیلی روشن)",
  "rose-100": "صورتی خاکی ۱۰۰",
  "rose-200": "صورتی خاکی ۲۰۰",
  "rose-300": "صورتی خاکی ۳۰۰",
  "rose-400": "صورتی خاکی ۴۰۰",
  "rose-500": "صورتی خاکی ۵۰۰ (accent اصلی)",
  "rose-600": "صورتی خاکی ۶۰۰",
  "rose-700": "صورتی خاکی ۷۰۰ (تیره)",

  "gold-50": "کهربایی ۵۰ (خیلی روشن)",
  "gold-100": "کهربایی ۱۰۰ (پس‌زمینه‌ی نشان تاییدیه)",
  "gold-200": "کهربایی ۲۰۰",
  "gold-300": "کهربایی ۳۰۰",
  "gold-400": "کهربایی ۴۰۰",
  "gold-500": "کهربایی ۵۰۰ (نشان تاییدیه‌ی ویژه)",
  "gold-600": "کهربایی ۶۰۰",

  charcoal: "متن اصلی و دکمه‌های اصلی (ink)",
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
