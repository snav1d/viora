import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeIranianPhone } from "@/lib/validation/phone";
import { requestOtp, OtpCooldownError } from "@/lib/auth/otp";

const bodySchema = z.object({ phone: z.string() });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "شماره موبایل نامعتبر است." }, { status: 400 });
  }

  const phone = normalizeIranianPhone(parsed.data.phone);
  if (!phone) {
    return NextResponse.json({ error: "شماره موبایل نامعتبر است." }, { status: 400 });
  }

  try {
    await requestOtp(phone);
  } catch (error) {
    if (error instanceof OtpCooldownError) {
      return NextResponse.json(
        { error: `کمی صبر کنید و دوباره تلاش کنید (${error.secondsRemaining} ثانیه).` },
        { status: 429 },
      );
    }
    throw error;
  }

  return NextResponse.json({ ok: true, phone });
}
