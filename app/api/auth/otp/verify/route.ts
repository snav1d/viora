import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeIranianPhone } from "@/lib/validation/phone";
import { verifyOtp } from "@/lib/auth/otp";
import { createSession } from "@/lib/auth/session";

const bodySchema = z.object({ phone: z.string(), code: z.string() });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }

  const phone = normalizeIranianPhone(parsed.data.phone);
  if (!phone) {
    return NextResponse.json({ error: "شماره موبایل نامعتبر است." }, { status: 400 });
  }

  const result = await verifyOtp(phone, parsed.data.code.trim());
  if (!result) {
    return NextResponse.json({ error: "کد وارد شده اشتباه یا منقضی شده است." }, { status: 400 });
  }

  await createSession({ userId: result.userId, phone });

  return NextResponse.json({ ok: true });
}
