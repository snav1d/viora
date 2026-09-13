import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { parseRoles } from "@/lib/auth/roles";

const bodySchema = z.object({
  businessName: z.string().min(2),
  description: z.string().min(1).optional(),
  categoryId: z.string().min(1),
  cityId: z.string().min(1),
  nationalId: z.string().regex(/^\d{10}$/, "کد ملی/شناسه صنفی باید ۱۰ رقم باشد."),
  bankAccountIban: z.string().regex(/^IR\d{24}$/, "شماره شبا باید با IR شروع شود و ۲۴ رقم داشته باشد."),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ابتدا وارد شوید.", requiresAuth: true }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات وارد شده کامل یا معتبر نیست." }, { status: 400 });
  }

  const existing = await prisma.sellerProfile.findUnique({ where: { userId: session.userId } });
  if (existing) {
    return NextResponse.json(
      { error: "شما قبلاً برای این حساب درخواست فروشندگی ثبت کرده‌اید." },
      { status: 400 },
    );
  }

  const [category, city] = await Promise.all([
    prisma.category.findUnique({ where: { id: parsed.data.categoryId } }),
    prisma.city.findUnique({ where: { id: parsed.data.cityId } }),
  ]);
  if (!category || category.type !== "PRODUCT" || !category.isActive) {
    return NextResponse.json({ error: "دسته‌بندی انتخاب‌شده معتبر نیست." }, { status: 400 });
  }
  if (!city || !city.isActive) {
    return NextResponse.json({ error: "شهر انتخاب‌شده معتبر نیست." }, { status: 400 });
  }

  // SellerProfile creation and the roles update must both happen or neither - a SellerProfile
  // without the SELLER role (or vice versa) would leave the account in a state nothing else in
  // this codebase expects. MySQL via @prisma/adapter-mariadb supports real transactions (unlike
  // the neon-http era - ADR 20), so this is a plain nested-write-free $transaction, not a
  // documented gap.
  const sellerProfile = await prisma.$transaction(async (tx) => {
    const profile = await tx.sellerProfile.create({
      data: {
        userId: session.userId,
        businessName: parsed.data.businessName,
        description: parsed.data.description,
        categoryId: category.id,
        cityId: city.id,
        nationalId: parsed.data.nationalId,
        bankAccountIban: parsed.data.bankAccountIban,
        status: "PENDING",
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
