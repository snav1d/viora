import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * User.roles is stored as Json (MySQL has no native scalar-list column - ADR 20), so reading it
 * back is an unknown JSON shape at compile time, not a typed string array. Trusted here to
 * actually be a string array - it's only ever written as one, by this same codebase.
 */
export function parseRoles(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}
