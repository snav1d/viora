import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { isValidPalette } from "@/lib/theme";
import type { Prisma } from "@/lib/generated/prisma/client";

/// All fields optional so this route serves both the plain isActive toggle (ActiveToggle, on the
/// list page) and the full edit form (ThemeForm), which always sends name/palette/dates together.
const bodySchema = z.object({
  name: z.string().trim().min(1, "نام تم را وارد کنید.").optional(),
  palette: z
    .unknown()
    .refine((v) => v === undefined || isValidPalette(v), { message: "پالت رنگی نامعتبر است." })
    .optional(),
  startsAt: z.string().min(1).optional(),
  endsAt: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const theme = await prisma.seasonalTheme.findUnique({ where: { id } });
  if (!theme) {
    return NextResponse.json({ error: "تم پیدا نشد." }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "اطلاعات وارد شده معتبر نیست." },
      { status: 400 },
    );
  }

  const nextStartsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : theme.startsAt;
  const nextEndsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : theme.endsAt;
  if (nextEndsAt <= nextStartsAt) {
    return NextResponse.json({ error: "تاریخ پایان باید بعد از تاریخ شروع باشد." }, { status: 400 });
  }

  await prisma.seasonalTheme.update({
    where: { id },
    data: {
      name: parsed.data.name,
      palette: parsed.data.palette as Prisma.InputJsonValue | undefined,
      startsAt: parsed.data.startsAt ? nextStartsAt : undefined,
      endsAt: parsed.data.endsAt ? nextEndsAt : undefined,
      isActive: parsed.data.isActive,
    },
  });

  return NextResponse.json({ ok: true });
}
