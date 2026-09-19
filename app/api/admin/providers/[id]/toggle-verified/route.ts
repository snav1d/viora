import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

type Params = { params: Promise<{ id: string }> };

/// "تاییدیه‌ی ویژه‌ی ویورا" (docs/decisions.md ADR 42) - a plain manual toggle, no real payment
/// behind it yet since this project's whole payment layer is still a mock.
export async function POST(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const provider = await prisma.serviceProviderProfile.findUnique({ where: { id } });
  if (!provider || provider.status !== "APPROVED") {
    return NextResponse.json({ error: "این پارتنر تایید‌شده نیست." }, { status: 400 });
  }

  await prisma.serviceProviderProfile.update({
    where: { id: provider.id },
    data: { isVerifiedByViora: !provider.isVerifiedByViora },
  });

  return NextResponse.json({ ok: true });
}
