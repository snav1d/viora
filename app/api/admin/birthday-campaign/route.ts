import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { setBirthdayCampaignSettings } from "@/lib/data/birthdayCampaign";

const bodySchema = z.object({
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"], { error: "نوع تخفیف را انتخاب کنید." }),
  value: z.number({ error: "مقدار تخفیف را وارد کنید." }).positive(),
});

/// Admin-configurable birthday-discount campaign settings (docs/decisions.md ADR 45) - whole-
/// order only for now (see lib/data/birthdayCampaign.ts).
export async function PATCH(request: Request) {
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

  await setBirthdayCampaignSettings(parsed.data);

  return NextResponse.json({ ok: true });
}
