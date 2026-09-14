import { z } from "zod";

/**
 * Accepts either an absolute URL (S3-compatible storage's own return shape) or a site-relative
 * path starting with "/" (LocalDiskStorageProvider's return shape - see
 * lib/providers/storage.ts). `z.string().url()` alone rejects the relative-path case, which is
 * exactly what every upload returns while STORAGE_PROVIDER="local" (the default, and what local
 * dev/testing runs without real S3 credentials) - confirmed directly, not assumed. See
 * docs/decisions.md ADR 29.
 */
export const storageUrlSchema = z
  .string()
  .min(1)
  .refine((value) => value.startsWith("/") || /^https?:\/\//.test(value), {
    message: "آدرس تصویر نامعتبر است.",
  });
