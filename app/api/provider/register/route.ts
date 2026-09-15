import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { parseRoles } from "@/lib/auth/roles";
import { storageUrlSchema } from "@/lib/validation/url";
import { randomSlug } from "@/lib/slug";

const tierSchema = z.object({
  minQuantity: z.number({ error: "بازه‌ی تیراژ نامعتبر است." }).int().positive(),
  maxQuantity: z.number().int().positive().nullable(),
  unitPrice: z.number({ error: "قیمت واحد نامعتبر است." }).int().positive(),
});

const bodySchema = z
  .object({
    businessName: z
      .string({ error: "نام کسب‌وکار را وارد کنید." })
      .min(2, "نام کسب‌وکار را وارد کنید."),
    businessLicenseImageUrl: storageUrlSchema,
    nationalId: z
      .string({ error: "کد ملی باید ۱۰ رقم باشد." })
      .regex(/^\d{10}$/, "کد ملی باید ۱۰ رقم باشد."),
    bankAccountIban: z
      .string({ error: "شماره شبا باید با IR شروع شود و ۲۴ رقم داشته باشد." })
      .regex(/^IR\d{24}$/, "شماره شبا باید با IR شروع شود و ۲۴ رقم داشته باشد."),
    supportsChrome: z.boolean(),
    supportsMatte: z.boolean(),
    printableColors: z
      .array(z.string().min(1), { error: "حداقل یک رنگ را وارد کنید." })
      .min(1, "حداقل یک رنگ را وارد کنید."),
    minOrderQuantity: z.number({ error: "حداقل تیراژ را وارد کنید." }).int().positive(),
    pricingTiers: z
      .array(tierSchema, { error: "حداقل یک بازه‌ی قیمتی لازم است." })
      .min(1, "حداقل یک بازه‌ی قیمتی لازم است."),
  })
  .superRefine((data, ctx) => {
    if (!data.supportsChrome && !data.supportsMatte) {
      ctx.addIssue({
        code: "custom",
        path: ["supportsChrome"],
        message: "حداقل یک نوع بادکنک را انتخاب کنید.",
      });
    }
    data.pricingTiers.forEach((tier, index) => {
      if (tier.maxQuantity !== null && tier.maxQuantity <= tier.minQuantity) {
        ctx.addIssue({
          code: "custom",
          path: ["pricingTiers", index, "maxQuantity"],
          message: "بازه‌ی تیراژ نامعتبر است.",
        });
      }
    });
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

  const existing = await prisma.serviceProviderProfile.findUnique({
    where: { userId: session.userId },
  });
  if (existing) {
    return NextResponse.json(
      { error: "شما قبلاً برای این حساب درخواست پارتنری ثبت کرده‌اید." },
      { status: 400 },
    );
  }

  // Colors are chosen from the admin-curated PrintColor list, not free text (docs/decisions.md
  // ADR 32) - never trust the client's own checkbox state, re-verify every submitted name is
  // still a real, currently-defined color.
  const validColors = new Set(
    (await prisma.printColor.findMany({ select: { name: true } })).map((c) => c.name),
  );
  if (!parsed.data.printableColors.every((color) => validColors.has(color))) {
    return NextResponse.json({ error: "یک یا چند رنگ انتخاب‌شده دیگر معتبر نیست." }, { status: 400 });
  }

  // Print-partner phase currently has exactly one SERVICE category (چاپ بادکنک تبلیغاتی) and one
  // active city (Tehran) - auto-assigned server-side rather than asked of the partner, same
  // reasoning as seller registration's city auto-assignment (docs/decisions.md ADR 29): asking
  // someone to "choose" between one available option is friction with no real decision behind
  // it. Revisit this one query if a second SERVICE category ever launches.
  const category = await prisma.category.findFirst({ where: { type: "SERVICE", isActive: true } });
  if (!category) {
    return NextResponse.json(
      { error: "در حال حاضر هیچ دسته‌بندی خدماتی فعال نیست." },
      { status: 400 },
    );
  }
  const city = await prisma.city.findFirst({ where: { isActive: true } });
  if (!city) {
    return NextResponse.json({ error: "در حال حاضر هیچ شهری فعال نیست." }, { status: 400 });
  }

  const lowestTierPrice = Math.min(...parsed.data.pricingTiers.map((tier) => tier.unitPrice));

  // ServiceProviderProfile + its ServiceOffering + PrintPricingTier rows + the role update must
  // all happen together, same reasoning as seller registration's transaction (ADR 29).
  const providerProfile = await prisma.$transaction(async (tx) => {
    const profile = await tx.serviceProviderProfile.create({
      data: {
        userId: session.userId,
        businessName: parsed.data.businessName,
        businessLicenseImageUrl: parsed.data.businessLicenseImageUrl,
        nationalId: parsed.data.nationalId,
        bankAccountIban: parsed.data.bankAccountIban,
        status: "PENDING",
      },
    });

    const offering = await tx.serviceOffering.create({
      data: {
        providerId: profile.id,
        categoryId: category.id,
        cityId: city.id,
        title: `چاپ بادکنک تبلیغاتی - ${parsed.data.businessName}`,
        slug: randomSlug(parsed.data.businessName),
        basePrice: lowestTierPrice,
        supportsChrome: parsed.data.supportsChrome,
        supportsMatte: parsed.data.supportsMatte,
        printableColors: parsed.data.printableColors,
        minOrderQuantity: parsed.data.minOrderQuantity,
        // Inactive until admin approval - see app/api/admin/providers/[id]/approve/route.ts,
        // which flips this true. Created now (not after approval) so the partner never has to
        // re-enter their print settings once approved, but it must never be visible to customers
        // before then.
        isActive: false,
      },
    });

    await tx.printPricingTier.createMany({
      data: parsed.data.pricingTiers.map((tier) => ({
        serviceOfferingId: offering.id,
        minQuantity: tier.minQuantity,
        maxQuantity: tier.maxQuantity,
        unitPrice: tier.unitPrice,
      })),
    });

    const user = await tx.user.findUniqueOrThrow({ where: { id: session.userId } });
    const roles = parseRoles(user.roles);
    if (!roles.includes("SERVICE_PROVIDER")) {
      await tx.user.update({
        where: { id: user.id },
        data: { roles: [...roles, "SERVICE_PROVIDER"] },
      });
    }

    return profile;
  });

  return NextResponse.json({ ok: true, providerProfileId: providerProfile.id });
}
