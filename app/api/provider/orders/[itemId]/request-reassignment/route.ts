import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedProvider } from "@/lib/auth/provider";

type Params = { params: Promise<{ itemId: string }> };

/// Puts an already-accepted, not-yet-shipped print order up for another eligible partner to pick
/// up instead (docs/decisions.md ADR 42's "بازار واگذاری سفارش") - the requesting provider keeps
/// full ownership/access until someone else actually claims it via
/// /api/provider/orders/[itemId]/claim.
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
  if (!item.acceptedAt) {
    return NextResponse.json({ error: "ابتدا باید سفارش را بپذیرید." }, { status: 400 });
  }
  if (item.shippedAt) {
    return NextResponse.json({ error: "این سفارش قبلاً ارسال شده است." }, { status: 400 });
  }
  if (item.reassignmentRequestedAt) {
    return NextResponse.json({ error: "درخواست واگذاری قبلاً برای این سفارش ثبت شده است." }, { status: 400 });
  }

  await prisma.orderItem.update({
    where: { id: item.id },
    data: { reassignmentRequestedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
