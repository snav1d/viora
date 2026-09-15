import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { getMatchingPrintProviders } from "@/lib/data/print";

const bodySchema = z.object({
  finish: z.enum(["CHROME", "MATTE"], { error: "نوع بادکنک را انتخاب کنید." }),
  color: z.string({ error: "رنگ را انتخاب کنید." }).min(1, "رنگ را انتخاب کنید."),
  quantity: z.number({ error: "تیراژ را وارد کنید." }).int().positive(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ابتدا وارد شوید.", requiresAuth: true }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "درخواست نامعتبر است." },
      { status: 400 },
    );
  }

  const city = await prisma.city.findFirst({ where: { isActive: true } });
  if (!city) {
    return NextResponse.json({ error: "در حال حاضر هیچ شهری فعال نیست." }, { status: 400 });
  }

  const providers = await getMatchingPrintProviders({ cityId: city.id, ...parsed.data });

  return NextResponse.json({ ok: true, providers });
}
