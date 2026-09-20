import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { parseRoles } from "@/lib/auth/roles";
import { storageUrlSchema } from "@/lib/validation/url";
import { getSimpleServiceCategory } from "@/lib/serviceCategories";
import { MIN_REGISTRATION_PORTFOLIO_IMAGES } from "@/lib/portfolio";

const bodySchema = z.object({
  categorySlug: z.string({ error: "دسته‌بندی نامعتبر است." }),
  businessName: z.string({ error: "نام کسب‌وکار را وارد کنید." }).min(2, "نام کسب‌وکار را وارد کنید."),
  contactPersonName: z
    .string({ error: "نام و نام‌خانوادگی مسئول کسب‌وکار را وارد کنید." })
    .min(2, "نام و نام‌خانوادگی مسئول کسب‌وکار را وارد کنید."),
  businessLicenseImageUrl: storageUrlSchema,
  nationalId: z.string({ error: "کد ملی باید ۱۰ رقم باشد." }).regex(/^\d{10}$/, "کد ملی باید ۱۰ رقم باشد."),
  bankAccountIban: z
    .string({ error: "شماره شبا باید با IR شروع شود و ۲۴ رقم داشته باشد." })
    .regex(/^IR\d{24}$/, "شماره شبا باید با IR شروع شود و ۲۴ رقم داشته باشد."),
  portfolioImageUrls: z
    .array(storageUrlSchema, { error: `حداقل ${MIN_REGISTRATION_PORTFOLIO_IMAGES} نمونه‌کار لازم است.` })
    .min(MIN_REGISTRATION_PORTFOLIO_IMAGES, `حداقل ${MIN_REGISTRATION_PORTFOLIO_IMAGES} نمونه‌کار لازم است.`),
});

/// Registers a "simple" service-provider category (balloon-decor, photography, and any future
/// one added to lib/serviceCategories.ts) - the print-partner registration route
/// (/api/provider/register) is entirely separate and untouched, since print keeps its own
/// dedicated color/finish/pricing-tier shape (docs/decisions.md ADR 43).
///
/// Unlike ADR 43's original version, this no longer collects any price/package field, and never
/// creates a ServiceOffering at all - a "simple" provider builds their own, any number of them,
/// any time after admin approval, from /provider/services (docs/decisions.md ADR 44). It does
/// require a minimum set of portfolio photos up front (ADR 44 item 4): these become the
/// provider's own ProviderPortfolioImage rows immediately, invisible to the public either way
/// until the provider is APPROVED (every public listing query already filters on that).
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

  const categoryDef = getSimpleServiceCategory(parsed.data.categorySlug);
  if (!categoryDef) {
    return NextResponse.json({ error: "دسته‌بندی انتخاب‌شده معتبر نیست." }, { status: 400 });
  }

  const existing = await prisma.serviceProviderProfile.findUnique({ where: { userId: session.userId } });
  if (existing) {
    return NextResponse.json(
      { error: "شما قبلاً برای این حساب درخواست پارتنری ثبت کرده‌اید." },
      { status: 400 },
    );
  }

  const category = await prisma.category.findFirst({
    where: { slug: categoryDef.slug, type: "SERVICE", isActive: true },
  });
  if (!category) {
    return NextResponse.json({ error: "در حال حاضر این دسته‌بندی خدماتی فعال نیست." }, { status: 400 });
  }

  const providerProfile = await prisma.$transaction(async (tx) => {
    const profile = await tx.serviceProviderProfile.create({
      data: {
        userId: session.userId,
        categoryId: category.id,
        businessName: parsed.data.businessName,
        contactPersonName: parsed.data.contactPersonName,
        businessLicenseImageUrl: parsed.data.businessLicenseImageUrl,
        nationalId: parsed.data.nationalId,
        bankAccountIban: parsed.data.bankAccountIban,
        status: "PENDING",
      },
    });

    await tx.providerPortfolioImage.createMany({
      data: parsed.data.portfolioImageUrls.map((imageUrl) => ({ providerId: profile.id, imageUrl })),
    });

    const user = await tx.user.findUniqueOrThrow({ where: { id: session.userId } });
    const roles = parseRoles(user.roles);
    if (!roles.includes("SERVICE_PROVIDER")) {
      await tx.user.update({ where: { id: user.id }, data: { roles: [...roles, "SERVICE_PROVIDER"] } });
    }

    return profile;
  });

  return NextResponse.json({ ok: true, providerProfileId: providerProfile.id });
}
