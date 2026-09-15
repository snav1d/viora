import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { parseRoles } from "@/lib/auth/roles";
import { storageUrlSchema } from "@/lib/validation/url";
import { normalizeIranianContactNumber } from "@/lib/validation/phone";
import { REFERRAL_SOURCES } from "@/lib/seller/registration";

const referralSourceValues = REFERRAL_SOURCES.map((option) => option.value) as [string, ...string[]];

const bodySchema = z
  .object({
    businessName: z.string({ error: "نام فروشگاه را وارد کنید." }).min(2, "نام فروشگاه را وارد کنید."),
    avatarUrl: storageUrlSchema,
    categoryIds: z
      .array(z.string().min(1), { error: "حداقل یک دسته‌بندی را انتخاب کنید." })
      .min(1, "حداقل یک دسته‌بندی را انتخاب کنید."),
    description: z.string().min(1).optional(),
    businessLicenseImageUrl: storageUrlSchema,
    nationalId: z
      .string({ error: "کد ملی باید ۱۰ رقم باشد." })
      .regex(/^\d{10}$/, "کد ملی باید ۱۰ رقم باشد."),
    unionId: z.string({ error: "شناسه‌ی صنفی را وارد کنید." }).min(1, "شناسه‌ی صنفی را وارد کنید."),
    bankAccountIban: z
      .string({ error: "شماره شبا باید با IR شروع شود و ۲۴ رقم داشته باشد." })
      .regex(/^IR\d{24}$/, "شماره شبا باید با IR شروع شود و ۲۴ رقم داشته باشد."),
    termsAccepted: z.literal(true, {
      error: "برای ادامه باید قوانین و شرایط همکاری را بپذیرید.",
    }),
    address: z.string({ error: "آدرس فروشگاه یا انبار را وارد کنید." }).min(1, "آدرس فروشگاه یا انبار را وارد کنید."),
    phoneNumbers: z
      .array(z.string(), { error: "حداقل یک شماره تماس لازم است." })
      .min(1, "حداقل یک شماره تماس لازم است.")
      .max(5),
    referralSource: z.enum(referralSourceValues, { error: "لطفاً یک گزینه را انتخاب کنید." }),
    referralSourceOther: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.referralSource === "other" && !data.referralSourceOther) {
      ctx.addIssue({
        code: "custom",
        path: ["referralSourceOther"],
        message: "لطفاً بگویید از چه راهی با ویورا آشنا شدید.",
      });
    }
  });

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ابتدا وارد شوید.", requiresAuth: true }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "اطلاعات وارد شده کامل یا معتبر نیست." },
      { status: 400 },
    );
  }

  const existing = await prisma.sellerProfile.findUnique({ where: { userId: session.userId } });
  if (existing) {
    return NextResponse.json(
      { error: "شما قبلاً برای این حساب درخواست فروشندگی ثبت کرده‌اید." },
      { status: 400 },
    );
  }

  // A shop's own contact number can reasonably be a landline, not just mobile - see
  // normalizeIranianContactNumber's own note (docs/decisions.md ADR 29).
  const phoneNumbers = parsed.data.phoneNumbers.map((phone) => normalizeIranianContactNumber(phone));
  if (phoneNumbers.some((phone) => phone === null)) {
    return NextResponse.json({ error: "شماره تماس واردشده معتبر نیست." }, { status: 400 });
  }

  const categories = await prisma.category.findMany({
    where: { id: { in: parsed.data.categoryIds } },
  });
  if (
    categories.length !== parsed.data.categoryIds.length ||
    categories.some((category) => category.type !== "PRODUCT" || !category.isActive)
  ) {
    return NextResponse.json({ error: "دسته‌بندی انتخاب‌شده معتبر نیست." }, { status: 400 });
  }

  // City selection was dropped from the wizard itself (see docs/decisions.md ADR 29) - Viora is
  // still a single-city (Tehran) beachhead, so asking a seller to "choose" between one available
  // option is pure friction, not a real decision. Auto-assigned to whichever city is active
  // instead; if a second city ever opens, this single line is what needs revisiting, not the
  // wizard's UI.
  const city = await prisma.city.findFirst({ where: { isActive: true } });
  if (!city) {
    return NextResponse.json(
      { error: "در حال حاضر هیچ شهری برای ثبت‌نام فروشنده فعال نیست." },
      { status: 400 },
    );
  }

  // SellerProfile creation (with its category links) and the roles update must all happen or
  // none of them - a SellerProfile without the SELLER role (or without any category) would leave
  // the account in a state nothing else in this codebase expects. MySQL via
  // @prisma/adapter-mariadb supports real transactions (ADR 20), so this is a plain
  // nested-write-free $transaction.
  const sellerProfile = await prisma.$transaction(async (tx) => {
    const profile = await tx.sellerProfile.create({
      data: {
        userId: session.userId,
        businessName: parsed.data.businessName,
        avatarUrl: parsed.data.avatarUrl,
        description: parsed.data.description,
        businessLicenseImageUrl: parsed.data.businessLicenseImageUrl,
        nationalId: parsed.data.nationalId,
        unionId: parsed.data.unionId,
        bankAccountIban: parsed.data.bankAccountIban,
        cityId: city.id,
        address: parsed.data.address,
        phoneNumbers,
        referralSource: parsed.data.referralSource,
        referralSourceOther: parsed.data.referralSourceOther,
        termsAcceptedAt: new Date(),
        status: "PENDING",
        categories: {
          create: parsed.data.categoryIds.map((categoryId) => ({ categoryId })),
        },
      },
    });

    const user = await tx.user.findUniqueOrThrow({ where: { id: session.userId } });
    const roles = parseRoles(user.roles);
    if (!roles.includes("SELLER")) {
      await tx.user.update({ where: { id: user.id }, data: { roles: [...roles, "SELLER"] } });
    }

    return profile;
  });

  return NextResponse.json({ ok: true, sellerProfileId: sellerProfile.id });
}
