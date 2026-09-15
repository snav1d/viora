import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

const bodySchema = z
  .object({
    code: z
      .string({ error: "کد تخفیف را وارد کنید." })
      .trim()
      .min(3, "کد تخفیف باید حداقل ۳ کاراکتر باشد.")
      .transform((v) => v.toUpperCase()),
    type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"], { error: "نوع تخفیف را انتخاب کنید." }),
    value: z.number({ error: "مقدار تخفیف را وارد کنید." }).int().positive(),
    maxDiscountAmount: z.number().int().positive().optional(),
    minOrderAmount: z.number().int().positive().optional(),
    maxRedemptions: z.number().int().positive().optional(),
    maxRedemptionsPerUser: z.number().int().positive().optional(),
    startsAt: z.string().min(1).optional(),
    endsAt: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "PERCENTAGE" && data.value > 100) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد." });
    }
    if (data.startsAt && data.endsAt && new Date(data.endsAt) <= new Date(data.startsAt)) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "تاریخ پایان باید بعد از تاریخ شروع باشد." });
    }
  });

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "اطلاعات وارد شده معتبر نیست." },
      { status: 400 },
    );
  }

  try {
    const coupon = await prisma.coupon.create({
      data: {
        code: parsed.data.code,
        type: parsed.data.type,
        value: parsed.data.value,
        maxDiscountAmount: parsed.data.maxDiscountAmount,
        minOrderAmount: parsed.data.minOrderAmount,
        maxRedemptions: parsed.data.maxRedemptions,
        maxRedemptionsPerUser: parsed.data.maxRedemptionsPerUser,
        startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      },
    });
    return NextResponse.json({ ok: true, couponId: coupon.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "این کد تخفیف قبلاً ثبت شده است." }, { status: 400 });
    }
    throw error;
  }
}
