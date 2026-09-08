import type { Prisma } from "@/lib/generated/prisma/client";

/** Prisma's Decimal (Toman amounts) isn't a plain number - convert before formatting/math. */
export function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === "number" ? value : value.toNumber();
}
