import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { getSmsProvider } from "@/lib/providers/sms";
import { getBirthdayCampaignSettings } from "@/lib/data/birthdayCampaign";
import { COUPON_TYPE_LABELS } from "@/lib/labels";

const bodySchema = z.object({
  // Same ISO-date shape JalaliDatePicker already hands every other route (print-orders'
  // requestedDeliveryDate, service-bookings' eventDate) - Jalali-in-the-UI, Gregorian ISO once
  // it leaves the browser.
  birthDate: z.string({ error: "تاریخ تولد را وارد کنید." }).min(1, "تاریخ تولد را وارد کنید."),
});

function randomCode(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `BDAY${digits}`;
}

/// Sets User.birthDate (once - this route is a one-time claim, not an editable field) and
/// immediately issues a single-use, single-user Coupon from the admin-configured campaign
/// settings, sent via the mock SmsProvider (docs/decisions.md ADR 45).
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ابتدا وارد شوید.", requiresAuth: true }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "کاربر پیدا نشد." }, { status: 404 });
  }
  if (user.birthDate !== null) {
    return NextResponse.json({ error: "تاریخ تولد قبلاً ثبت شده است." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "تاریخ تولد نامعتبر است." },
      { status: 400 },
    );
  }

  const birthDate = new Date(parsed.data.birthDate);
  const now = new Date();
  if (Number.isNaN(birthDate.getTime()) || birthDate >= now) {
    return NextResponse.json({ error: "تاریخ تولد نامعتبر است." }, { status: 400 });
  }

  const settings = await getBirthdayCampaignSettings();

  // A cuid-based User.id is already globally unique/unguessable - three digits is plenty of
  // headroom against a collision for a single admin-facing retry loop like this one.
  let code = randomCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (!existing) break;
    code = randomCode();
  }

  const [, coupon] = await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { birthDate } }),
    prisma.coupon.create({
      data: {
        code,
        type: settings.type,
        value: settings.value,
        maxRedemptionsPerUser: 1,
        userId: user.id,
      },
    }),
  ]);

  const valueLabel =
    settings.type === "PERCENTAGE"
      ? `${settings.value.toLocaleString("fa-IR")}٪`
      : `${settings.value.toLocaleString("fa-IR")} تومان`;
  await getSmsProvider().send(
    user.phone,
    `تولدت مبارک! ${valueLabel} تخفیف ویژه‌ی تو با کد ${coupon.code} روی سفارش بعدیت منتظرته.`,
  );

  return NextResponse.json({
    ok: true,
    code: coupon.code,
    type: settings.type,
    value: settings.value,
    typeLabel: COUPON_TYPE_LABELS[settings.type],
  });
}
