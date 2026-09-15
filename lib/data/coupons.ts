import "server-only";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import type { Coupon } from "@/lib/generated/prisma/client";

export type CouponValidationResult =
  | { ok: true; coupon: Coupon; discountAmount: number }
  | { ok: false; error: string };

/// Shared by the preview endpoint (/api/coupons/validate, called while the customer is still
/// editing their order) and both order-creation routes (/api/checkout, /api/print-orders, which
/// re-run this at the moment of charge - never trusting the preview result, same "never trust an
/// earlier read" posture ADR 31 already established for print-partner matching). `subtotal` is
/// what the coupon discounts - the real, server-computed amount after any seller-level discount
/// (Product.discountPrice) but before this coupon, never a client-supplied number at the
/// order-creation call site. See docs/decisions.md ADR 35.
export async function validateCoupon(
  code: string,
  userId: string,
  subtotal: number,
): Promise<CouponValidationResult> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon || !coupon.isActive) {
    return { ok: false, error: "کد تخفیف معتبر نیست." };
  }

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) {
    return { ok: false, error: "این کد تخفیف هنوز فعال نشده است." };
  }
  if (coupon.endsAt && now > coupon.endsAt) {
    return { ok: false, error: "این کد تخفیف منقضی شده است." };
  }

  if (coupon.minOrderAmount !== null && subtotal < toNumber(coupon.minOrderAmount)) {
    return {
      ok: false,
      error: `این کد تخفیف فقط برای سفارش‌های بالای ${toNumber(coupon.minOrderAmount).toLocaleString("fa-IR")} تومان معتبر است.`,
    };
  }

  if (coupon.maxRedemptions !== null) {
    const totalUsed = await prisma.order.count({
      where: { couponId: coupon.id, paymentStatus: "PAID" },
    });
    if (totalUsed >= coupon.maxRedemptions) {
      return { ok: false, error: "ظرفیت این کد تخفیف تمام شده است." };
    }
  }

  if (coupon.maxRedemptionsPerUser !== null) {
    const usedByUser = await prisma.order.count({
      where: { couponId: coupon.id, userId, paymentStatus: "PAID" },
    });
    if (usedByUser >= coupon.maxRedemptionsPerUser) {
      return { ok: false, error: "شما قبلاً از این کد تخفیف استفاده کرده‌اید." };
    }
  }

  let discountAmount =
    coupon.type === "PERCENTAGE" ? subtotal * (toNumber(coupon.value) / 100) : toNumber(coupon.value);
  if (coupon.maxDiscountAmount !== null) {
    discountAmount = Math.min(discountAmount, toNumber(coupon.maxDiscountAmount));
  }
  // A coupon can never make an order free or negative - the platform absorbs at most the
  // subtotal itself.
  discountAmount = Math.min(Math.round(discountAmount), subtotal);

  return { ok: true, coupon, discountAmount };
}
