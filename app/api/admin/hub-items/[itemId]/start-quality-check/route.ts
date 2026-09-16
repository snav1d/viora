import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

type Params = { params: Promise<{ itemId: string }> };

/// RECEIVED_AT_HUB -> QUALITY_CHECK. A separate step from finalize() rather than one combined
/// action, so QUALITY_CHECK is a real, observable state (an item genuinely being checked right
/// now, not just a value nothing ever sets) - docs/decisions.md ADR 37.
export async function POST(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { itemId } = await params;
  const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
  if (!item) {
    return NextResponse.json({ error: "آیتم پیدا نشد." }, { status: 404 });
  }
  if (item.hubStatus !== "RECEIVED_AT_HUB") {
    return NextResponse.json({ error: "این آیتم در وضعیت دریافت‌شده در مرکز نیست." }, { status: 400 });
  }

  await prisma.orderItem.update({ where: { id: item.id }, data: { hubStatus: "QUALITY_CHECK" } });

  return NextResponse.json({ ok: true });
}
