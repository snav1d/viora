import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { storageUrlSchema } from "@/lib/validation/url";

/// Same relative-or-absolute shape as storageUrlSchema (a banner can link to an in-app page or
/// an external URL) but with a link-appropriate error message instead of that schema's
/// image-specific one.
const linkSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => value.startsWith("/") || /^https?:\/\//.test(value), { message: "لینک نامعتبر است." });

const bodySchema = z
  .object({
    imageUrl: storageUrlSchema,
    text: z.string({ error: "متن بنر را وارد کنید." }).trim().min(1, "متن بنر را وارد کنید."),
    link: z.union([linkSchema, z.null()]).optional(),
    placement: z.enum(["HOME_HERO", "HOME_PROMO_STRIP", "SERVICES_HERO"], {
      error: "جایگاه بنر را انتخاب کنید.",
    }),
    startsAt: z.string().min(1).optional(),
    endsAt: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startsAt && data.endsAt && new Date(data.endsAt) <= new Date(data.startsAt)) {
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

  const banner = await prisma.banner.create({
    data: {
      imageUrl: parsed.data.imageUrl,
      text: parsed.data.text,
      link: parsed.data.link,
      placement: parsed.data.placement,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
    },
  });

  return NextResponse.json({ ok: true, bannerId: banner.id });
}
