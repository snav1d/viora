import { randomBytes } from "node:crypto";

/**
 * Seller-entered product titles are almost always Persian, which has no ASCII transliteration
 * in this codebase - stripping non a-z0-9 leaves an empty string for a purely-Persian title, so
 * a random suffix (not a best-effort transliteration) is what actually keeps `Product.slug`
 * both URL-safe and unique. See docs/decisions.md ADR 27.
 */
export function productSlug(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = randomBytes(4).toString("hex");
  return base ? `${base}-${suffix}` : suffix;
}
