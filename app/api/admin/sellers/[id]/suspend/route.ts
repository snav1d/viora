import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

type Params = { params: Promise<{ id: string }> };

/// Manual-only, per docs/decisions.md ADR 38 - nothing in this codebase ever calls this route
/// except an admin clicking the button; a seller's return rate never triggers it automatically.
/// Only an APPROVED seller can be suspended - PENDING/REJECTED aren't operating in the first
/// place, and SUSPENDED is already this state.
export async function POST(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const seller = await prisma.sellerProfile.findUnique({ where: { id } });
  if (!seller) {
    return NextResponse.json({ error: "فروشنده پیدا نشد." }, { status: 404 });
  }
  if (seller.status !== "APPROVED") {
    return NextResponse.json({ error: "فقط فروشنده‌ی تایید‌شده قابل تعلیق است." }, { status: 400 });
  }

  await prisma.sellerProfile.update({ where: { id }, data: { status: "SUSPENDED" } });

  return NextResponse.json({ ok: true });
}
