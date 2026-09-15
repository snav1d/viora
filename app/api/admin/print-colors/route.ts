import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

const bodySchema = z.object({
  name: z.string({ error: "نام رنگ را وارد کنید." }).trim().min(1, "نام رنگ را وارد کنید."),
});

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "درخواست نامعتبر است." },
      { status: 400 },
    );
  }

  try {
    const color = await prisma.printColor.create({ data: { name: parsed.data.name } });
    return NextResponse.json({ ok: true, color });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "این رنگ قبلاً ثبت شده است." }, { status: 400 });
    }
    throw error;
  }
}
