import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { getPaymentProvider } from "@/lib/providers/payment";
import { validateCoupon } from "@/lib/data/coupons";
import { toNumber } from "@/lib/decimal";
import { applyPlatformMarkup } from "@/lib/pricing";
import { getSimpleServiceCategory } from "@/lib/serviceCategories";
import { normalizeIranianContactNumber } from "@/lib/validation/phone";

const bodySchema = z.object({
  categorySlug: z.string({ error: "دسته‌بندی نامعتبر است." }),
  offeringId: z.string({ error: "پارتنر را انتخاب کنید." }).min(1, "پارتنر را انتخاب کنید."),
  eventDate: z.string({ error: "تاریخ رویداد را انتخاب کنید." }).min(1, "تاریخ رویداد را انتخاب کنید."),
  address: z.string({ error: "آدرس محل برگزاری را وارد کنید." }).min(3, "آدرس محل برگزاری را وارد کنید."),
  // "شماره تماس برای هماهنگی" - mandatory (docs/decisions.md ADR 45), unlike every other order-
  // creation route which has no such field yet.
  contactPhone: z
    .string({ error: "شماره تماس برای هماهنگی را وارد کنید." })
    .refine((value) => normalizeIranianContactNumber(value) !== null, {
      message: "شماره تماس معتبر نیست.",
    }),
  notes: z.string().min(1).optional(),
  couponCode: z.string().trim().min(1).optional(),
});

/// Books a flat-package "simple" service offering (balloon-decor, photography, ...) - no per-
/// order customization exists for these (docs/decisions.md ADR 43's confirmed "Option A"), so
/// this is much simpler than /api/print-orders: no matching/tiers, just re-verifying the chosen
/// offering is still real and charging its own basePrice as-is.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ابتدا وارد شوید.", requiresAuth: true }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "اطلاعات سفارش کامل یا معتبر نیست." },
      { status: 400 },
    );
  }

  const categoryDef = getSimpleServiceCategory(parsed.data.categorySlug);
  if (!categoryDef) {
    return NextResponse.json({ error: "دسته‌بندی انتخاب‌شده معتبر نیست." }, { status: 400 });
  }

  const eventDate = new Date(parsed.data.eventDate);
  if (Number.isNaN(eventDate.getTime())) {
    return NextResponse.json({ error: "تاریخ رویداد نامعتبر است." }, { status: 400 });
  }

  // Never trust the client's earlier listing fetch - re-verify the offering still actually
  // qualifies at the moment of creating a real order, same reasoning as /api/print-orders.
  const offering = await prisma.serviceOffering.findUnique({
    where: { id: parsed.data.offeringId },
    include: { provider: true, category: true },
  });
  if (
    !offering ||
    !offering.isActive ||
    offering.provider.status !== "APPROVED" ||
    offering.category.slug !== categoryDef.slug
  ) {
    return NextResponse.json(
      { error: "این پارتنر دیگر برای این سفارش در دسترس نیست. لطفاً دوباره تلاش کنید." },
      { status: 400 },
    );
  }

  // unitPrice below is the provider's own raw basePrice - what they're actually paid, stored
  // unmarked-up on OrderItem for settlement. subtotal is the customer-facing number (already
  // shown on the booking page via getBookableOffering) that totalAmount/coupon-base use
  // instead (docs/decisions.md ADR 45).
  const unitPrice = toNumber(offering.basePrice);
  const subtotal = applyPlatformMarkup(unitPrice);

  // Never trust the client's own earlier /api/coupons/validate preview - re-verify at the moment
  // of actually charging, same reasoning as /api/print-orders and /api/checkout.
  let couponId: string | null = null;
  let discountAmount = 0;
  if (parsed.data.couponCode) {
    const result = await validateCoupon(parsed.data.couponCode, session.userId, subtotal);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    couponId = result.coupon.id;
    discountAmount = result.discountAmount;
  }

  const totalAmount = subtotal - discountAmount;

  const order = await prisma.order.create({
    data: {
      userId: session.userId,
      orderType: "SERVICE",
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      totalAmount,
      eventDate,
      shippingAddress: parsed.data.address,
      contactPhone: normalizeIranianContactNumber(parsed.data.contactPhone),
      couponId,
      discountAmount,
      items: {
        create: [
          {
            serviceOfferingId: offering.id,
            providerId: offering.providerId,
            quantity: 1,
            unitPrice,
            splitAmount: unitPrice,
            customerNotes: parsed.data.notes,
          },
        ],
      },
    },
  });

  const charge = await getPaymentProvider().charge({ orderId: order.id, amount: totalAmount });

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: charge.success
      ? { paymentStatus: "PAID", status: "PROCESSING" }
      : { paymentStatus: "FAILED" },
  });

  return NextResponse.json({ ok: true, orderId: updated.id });
}
