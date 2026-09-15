import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { validateCoupon } from "@/lib/data/coupons";

const bodySchema = z.object({
  code: z.string({ error: "کد تخفیف را وارد کنید." }).trim().min(1, "کد تخفیف را وارد کنید."),
  subtotal: z.number().int().positive(),
});

// A preview only - never trusted at order-creation time (see lib/data/coupons.ts). Lets the
// customer see the discount before committing to checkout/submit.
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

  const result = await validateCoupon(parsed.data.code, session.userId, parsed.data.subtotal);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, discountAmount: result.discountAmount });
}
