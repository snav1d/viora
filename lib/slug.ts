import { randomBytes } from "node:crypto";

/**
 * Seller/partner-entered titles are almost always Persian, which has no ASCII transliteration
 * in this codebase - stripping non a-z0-9 leaves an empty string for a purely-Persian title, so
 * a random suffix (not a best-effort transliteration) is what actually keeps a slug both
 * URL-safe and unique. Used for both Product.slug (ADR 27) and ServiceOffering.slug (ADR 31).
 */
export function randomSlug(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = randomBytes(4).toString("hex");
  return base ? `${base}-${suffix}` : suffix;
}
