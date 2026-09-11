import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { suggestBundle } from "@/lib/wizard/engine";

const PARTY_TYPE = "تولد"; // Sprint 0's only supported party type - see docs/README.md §2.

const bodySchema = z.object({
  ageGroup: z.string().min(1),
  guestCount: z.number().int().min(1),
  budget: z.number().int().min(1),
  cityId: z.string().min(1),
  theme: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ابتدا وارد شوید.", requiresAuth: true }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات وارد شده کامل نیست." }, { status: 400 });
  }

  const city = await prisma.city.findUnique({ where: { id: parsed.data.cityId } });
  if (!city || !city.isActive) {
    return NextResponse.json({ error: "شهر انتخاب‌شده معتبر نیست." }, { status: 400 });
  }

  const bundle = await suggestBundle({
    cityId: city.id,
    theme: parsed.data.theme,
    budget: parsed.data.budget,
    guestCount: parsed.data.guestCount,
    ageGroup: parsed.data.ageGroup,
    partyType: PARTY_TYPE,
  });

  const partyProfile = await prisma.partyProfile.create({
    data: {
      userId: session.userId,
      partyType: PARTY_TYPE,
      ageGroup: parsed.data.ageGroup,
      guestCount: parsed.data.guestCount,
      budget: parsed.data.budget,
      cityId: city.id,
      theme: parsed.data.theme,
      suggestedBundle: bundle,
    },
  });

  return NextResponse.json({ ok: true, partyProfileId: partyProfile.id, bundle });
}
