import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { isValidPalette } from "@/lib/theme";
import type { Prisma } from "@/lib/generated/prisma/client";

const bodySchema = z
  .object({
    name: z.string({ error: "نام تم را وارد کنید." }).trim().min(1, "نام تم را وارد کنید."),
    palette: z.unknown().refine(isValidPalette, { message: "پالت رنگی نامعتبر است." }),
    startsAt: z.string({ error: "تاریخ شروع را انتخاب کنید." }).min(1, "تاریخ شروع را انتخاب کنید."),
    endsAt: z.string({ error: "تاریخ پایان را انتخاب کنید." }).min(1, "تاریخ پایان را انتخاب کنید."),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.endsAt) <= new Date(data.startsAt)) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "تاریخ پایان باید بعد از تاریخ شروع باشد." });
    }
  });

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "اطلاعات وارد شده معتبر نیست." },
      { status: 400 },
    );
  }

  const theme = await prisma.seasonalTheme.create({
    data: {
      name: parsed.data.name,
      palette: parsed.data.palette as Prisma.InputJsonValue,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
    },
  });

  return NextResponse.json({ ok: true, themeId: theme.id });
}
