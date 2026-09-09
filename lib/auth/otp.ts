import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
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

  const user = await findOrCreateUserByPhone(phone);

  return { userId: user.id };
}

/**
 * Not prisma.user.upsert(): that compiles to an implicit transaction, which the "neon-http"
 * DATABASE_DRIVER can't do at all (see docs/decisions.md ADR 18) - this is on the login-
 * completing path, so it has to work under every driver mode. find-then-create loses upsert's
 * single-round-trip atomicity, so a genuine race (two concurrent first-ever verifies for the
 * same brand-new phone number) is handled explicitly below instead of relying on the DB to
 * make it atomic.
 */
async function findOrCreateUserByPhone(phone: string) {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return existing;

  try {
    return await prisma.user.create({ data: { phone, roles: ["CUSTOMER"] } });
  } catch (error) {
    const isUniqueConstraintRace =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (!isUniqueConstraintRace) throw error;

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) throw error;
    return user;
  }
}
