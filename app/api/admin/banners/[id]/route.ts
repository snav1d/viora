import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { storageUrlSchema } from "@/lib/validation/url";

const linkSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => value.startsWith("/") || /^https?:\/\//.test(value), { message: "لینک نامعتبر است." });

/// All fields optional so this route serves both the plain isActive toggle (ActiveToggle) and
/// the full edit form (BannerForm). link/startsAt/endsAt accept an explicit null to clear a
/// previously-set value - omitted (undefined) means "leave unchanged".
const bodySchema = z.object({
  imageUrl: storageUrlSchema.optional(),
  text: z.string().trim().min(1, "متن بنر را وارد کنید.").optional(),
  link: z.union([linkSchema, z.null()]).optional(),
  placement: z.enum(["HOME_TOP"]).optional(),
  startsAt: z.union([z.string().min(1), z.null()]).optional(),
  endsAt: z.union([z.string().min(1), z.null()]).optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) {
    return NextResponse.json({ error: "بنر پیدا نشد." }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "اطلاعات وارد شده معتبر نیست." },
      { status: 400 },
    );
  }

  const nextStartsAt =
    parsed.data.startsAt !== undefined
      ? parsed.data.startsAt === null
        ? null
        : new Date(parsed.data.startsAt)
      : banner.startsAt;
  const nextEndsAt =
    parsed.data.endsAt !== undefined
      ? parsed.data.endsAt === null
        ? null
        : new Date(parsed.data.endsAt)
      : banner.endsAt;
  if (nextStartsAt && nextEndsAt && nextEndsAt <= nextStartsAt) {
    return NextResponse.json({ error: "تاریخ پایان باید بعد از تاریخ شروع باشد." }, { status: 400 });
  }

  await prisma.banner.update({
    where: { id },
    data: {
      imageUrl: parsed.data.imageUrl,
      text: parsed.data.text,
      link: parsed.data.link,
      placement: parsed.data.placement,
      startsAt: parsed.data.startsAt !== undefined ? nextStartsAt : undefined,
      endsAt: parsed.data.endsAt !== undefined ? nextEndsAt : undefined,
      isActive: parsed.data.isActive,
    },
  });

  return NextResponse.json({ ok: true });
}
