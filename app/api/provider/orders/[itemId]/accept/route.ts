import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedProvider } from "@/lib/auth/provider";

type Params = { params: Promise<{ itemId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const provider = await requireApprovedProvider();
  if (!provider) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { itemId } = await params;
  const item = await prisma.orderItem.findFirst({ where: { id: itemId, providerId: provider.id } });
  if (!item) {
    return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
  }
  if (item.acceptedAt) {
    return NextResponse.json({ error: "این سفارش قبلاً پذیرفته شده است." }, { status: 400 });
  }

  // Accepting is what unlocks the full order details (design file, color, notes) on the
  // provider's own detail page - panels-and-operations-spec.md §3's two-stage visibility.
  await prisma.orderItem.update({ where: { id: item.id }, data: { acceptedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
