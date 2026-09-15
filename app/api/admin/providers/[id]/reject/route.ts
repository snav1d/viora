import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

const bodySchema = z.object({
  reason: z.string({ error: "دلیل رد را وارد کنید." }).min(1, "دلیل رد را وارد کنید."),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const provider = await prisma.serviceProviderProfile.findUnique({ where: { id } });
  if (!provider) {
    return NextResponse.json({ error: "پارتنر پیدا نشد." }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "درخواست نامعتبر است." },
      { status: 400 },
    );
  }

  await prisma.serviceProviderProfile.update({
    where: { id },
    data: { status: "REJECTED", rejectionReason: parsed.data.reason },
  });

  return NextResponse.json({ ok: true });
}
