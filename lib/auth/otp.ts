import "server-only";
import { prisma } from "@/lib/prisma";
import { getSmsProvider } from "@/lib/providers/sms";

const OTP_LENGTH = 5;
const OTP_TTL_MINUTES = 2;
const RESEND_COOLDOWN_SECONDS = 60;

function generateCode(): string {
  const max = 10 ** OTP_LENGTH;
  return Math.floor(Math.random() * max).toString().padStart(OTP_LENGTH, "0");
}

export class OtpCooldownError extends Error {
  constructor(public secondsRemaining: number) {
    super(`Please wait ${secondsRemaining}s before requesting another code.`);
  }
}

export async function requestOtp(phone: string): Promise<void> {
  const recent = await prisma.otpCode.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
  });

  if (recent) {
    const secondsSince = (Date.now() - recent.createdAt.getTime()) / 1000;
    if (secondsSince < RESEND_COOLDOWN_SECONDS) {
      throw new OtpCooldownError(Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSince));
    }
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({ data: { phone, code, expiresAt } });

  await getSmsProvider().send(
    phone,
    `کد ورود ویورا: ${code} (تا ${OTP_TTL_MINUTES} دقیقه معتبر است)`,
  );
}

export async function verifyOtp(phone: string, code: string): Promise<{ userId: string } | null> {
  const otp = await prisma.otpCode.findFirst({
    where: { phone, code, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!otp || otp.expiresAt < new Date()) return null;

  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  });

  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone, roles: ["CUSTOMER"] },
  });

  return { userId: user.id };
}
