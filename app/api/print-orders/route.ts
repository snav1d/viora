import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { getPaymentProvider } from "@/lib/providers/payment";
import { getPrintDeliverySettings } from "@/lib/data/print";
import { validateCoupon } from "@/lib/data/coupons";
import { storageUrlSchema } from "@/lib/validation/url";

const bodySchema = z
  .object({
    offeringId: z.string({ error: "پارتنر را انتخاب کنید." }).min(1, "پارتنر را انتخاب کنید."),
    finish: z.enum(["CHROME", "MATTE"], { error: "نوع بادکنک را انتخاب کنید." }),
    color: z.string({ error: "رنگ را انتخاب کنید." }).min(1, "رنگ را انتخاب کنید."),
    quantity: z.number({ error: "تیراژ را وارد کنید." }).int().positive(),
    designFileUrl: storageUrlSchema,
    notes: z.string().min(1).optional(),
    isExpressDelivery: z.boolean(),
    requestedDeliveryDate: z.string().min(1).optional(),
    couponCode: z.string().trim().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isExpressDelivery && !data.requestedDeliveryDate) {
      ctx.addIssue({
        code: "custom",
        path: ["requestedDeliveryDate"],
        message: "تاریخ تحویل فوری را انتخاب کنید.",
      });
    }
  });

function parseColors(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

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

  // Never trust the client's earlier /api/print-orders/match result - re-verify the offering
  // still actually qualifies (provider approved, offering active, supports this finish/color,
  // accepts this quantity) at the moment of creating a real order, since availability/settings
  // could have changed since the customer loaded the matching list.
  const offering = await prisma.serviceOffering.findUnique({
    where: { id: parsed.data.offeringId },
    include: { provider: true, pricingTiers: true },
  });
  if (
    !offering ||
    !offering.isActive ||
    offering.provider.status !== "APPROVED" ||
    offering.minOrderQuantity === null ||
    parsed.data.quantity < offering.minOrderQuantity ||
    (parsed.data.finish === "CHROME" ? !offering.supportsChrome : !offering.supportsMatte) ||
    !parseColors(offering.printableColors).includes(parsed.data.color)
  ) {
    return NextResponse.json(
      { error: "این پارتنر دیگر برای این سفارش در دسترس نیست. لطفاً دوباره تلاش کنید." },
      { status: 400 },
    );
  }

  const tier = offering.pricingTiers.find(
    (t) =>
      parsed.data.quantity >= t.minQuantity &&
      (t.maxQuantity === null || parsed.data.quantity <= t.maxQuantity),
  );
  if (!tier) {
    return NextResponse.json(
      { error: "تعرفه‌ای برای این تیراژ در این پارتنر تعریف نشده است." },
      { status: 400 },
    );
  }
  const unitPrice = tier.unitPrice.toNumber();

  let expressFee = 0;
  let requestedDeliveryDate: Date | null = null;
  if (parsed.data.isExpressDelivery) {
    const settings = await getPrintDeliverySettings();
    expressFee = settings.expressFee;
    requestedDeliveryDate = new Date(parsed.data.requestedDeliveryDate!);
    if (Number.isNaN(requestedDeliveryDate.getTime())) {
      return NextResponse.json({ error: "تاریخ تحویل نامعتبر است." }, { status: 400 });
    }
  }

  const lineTotal = unitPrice * parsed.data.quantity;
  const subtotal = lineTotal + expressFee;

  // Never trust the client's own earlier /api/coupons/validate preview - re-verify at the
  // moment of actually charging. The discount comes off the customer-facing subtotal only - the
  // provider's own splitAmount below stays lineTotal, untouched by a platform coupon (docs/
  // decisions.md ADR 35), same reasoning as /api/checkout's seller-discount-but-not-coupon split.
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
      couponId,
      discountAmount,
      items: {
        create: [
          {
            serviceOfferingId: offering.id,
            providerId: offering.providerId,
            quantity: parsed.data.quantity,
            unitPrice,
            splitAmount: lineTotal,
            designFileUrl: parsed.data.designFileUrl,
            printColor: parsed.data.color,
            printFinish: parsed.data.finish,
            isExpressDelivery: parsed.data.isExpressDelivery,
            requestedDeliveryDate,
            expressFee: parsed.data.isExpressDelivery ? expressFee : null,
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
