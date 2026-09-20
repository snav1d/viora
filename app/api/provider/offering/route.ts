import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedProvider } from "@/lib/auth/provider";
import { PRINT_CATEGORY_SLUG, getSimpleServiceCategory } from "@/lib/serviceCategories";

const tierSchema = z.object({
  minQuantity: z.number({ error: "بازه‌ی تیراژ نامعتبر است." }).int().positive(),
  maxQuantity: z.number().int().positive().nullable(),
  unitPrice: z.number({ error: "قیمت واحد نامعتبر است." }).int().positive(),
});

const printBodySchema = z
  .object({
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

const simpleBodySchema = z.object({
  basePrice: z.number({ error: "قیمت پکیج را وارد کنید." }).int().positive(),
  customFieldValues: z.record(z.string(), z.number().int().positive()),
});

/// Lets an APPROVED provider edit their own ServiceOffering ANYTIME from their panel - not just
/// once at registration (docs/decisions.md ADR 43, explicitly requested for print too: "دقیقاً
/// مثل اینکه پارتنر چاپ می‌تونه تعرفه‌شو هر وقت خواست عوض کنه" - which print previously could NOT
/// actually do, a real gap this route closes for all three provider types at once). Which shape
/// to validate against is decided from the provider's OWN existing offering's category, never
/// trusted from the request body.
export async function PATCH(request: Request) {
  const provider = await requireApprovedProvider();
  if (!provider) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const offering = await prisma.serviceOffering.findFirst({
    where: { providerId: provider.id },
    include: { category: true },
  });
  if (!offering) {
    return NextResponse.json({ error: "پیشنهادی برای این حساب پیدا نشد." }, { status: 404 });
  }

  const rawBody = await request.json().catch(() => null);

  if (offering.category.slug === PRINT_CATEGORY_SLUG) {
    const parsed = printBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات وارد شده معتبر نیست." },
        { status: 400 },
      );
    }

    const validColors = new Set(
      (await prisma.printColor.findMany({ select: { name: true } })).map((c) => c.name),
    );
    if (!parsed.data.printableColors.every((color) => validColors.has(color))) {
      return NextResponse.json({ error: "یک یا چند رنگ انتخاب‌شده دیگر معتبر نیست." }, { status: 400 });
    }

    const lowestTierPrice = Math.min(...parsed.data.pricingTiers.map((tier) => tier.unitPrice));

    await prisma.$transaction(async (tx) => {
      await tx.serviceOffering.update({
        where: { id: offering.id },
        data: {
          supportsChrome: parsed.data.supportsChrome,
          supportsMatte: parsed.data.supportsMatte,
          printableColors: parsed.data.printableColors,
          minOrderQuantity: parsed.data.minOrderQuantity,
          basePrice: lowestTierPrice,
        },
      });
      await tx.printPricingTier.deleteMany({ where: { serviceOfferingId: offering.id } });
      await tx.printPricingTier.createMany({
        data: parsed.data.pricingTiers.map((tier) => ({
          serviceOfferingId: offering.id,
          minQuantity: tier.minQuantity,
          maxQuantity: tier.maxQuantity,
          unitPrice: tier.unitPrice,
        })),
      });
    });

    return NextResponse.json({ ok: true });
  }

  const categoryDef = getSimpleServiceCategory(offering.category.slug);
  if (!categoryDef) {
    return NextResponse.json({ error: "این نوع پیشنهاد از این مسیر قابل‌ویرایش نیست." }, { status: 400 });
  }

  const parsed = simpleBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "اطلاعات وارد شده معتبر نیست." },
      { status: 400 },
    );
  }
  const expectedKeys = categoryDef.customFields.map((field) => field.key).sort();
  const submittedKeys = Object.keys(parsed.data.customFieldValues).sort();
  if (JSON.stringify(expectedKeys) !== JSON.stringify(submittedKeys)) {
    return NextResponse.json({ error: "اطلاعات پکیج کامل یا معتبر نیست." }, { status: 400 });
  }

  await prisma.serviceOffering.update({
    where: { id: offering.id },
    data: {
      basePrice: parsed.data.basePrice,
      customFieldsSchema: categoryDef.customFields.length > 0 ? parsed.data.customFieldValues : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
