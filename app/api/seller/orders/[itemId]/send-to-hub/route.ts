import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOperatingSeller } from "@/lib/auth/seller";

type Params = { params: Promise<{ itemId: string }> };

/// A MULTI_SELLER order item's equivalent of the direct-ship route - no customer tracking code,
/// since the destination is the Viora hub, not the customer (docs/decisions.md ADR 37). There is
/// no separate hub-intake actor in this system (panels-and-operations-spec.md §1's own note that
/// the beachhead-phase hub is too small to need real warehouse modeling), so the seller's own
/// declaration that they've shipped it is what advances hubStatus straight to RECEIVED_AT_HUB -
/// the admin hub queue (/admin/hub) is simply a view of items at or past that state.
export async function POST(_request: Request, { params }: Params) {
  const seller = await requireOperatingSeller();
  if (!seller) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { itemId } = await params;
  const item = await prisma.orderItem.findFirst({ where: { id: itemId, sellerId: seller.id } });
  if (!item) {
    return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
  }
  if (item.hubStatus !== "PENDING_SELLER_SHIPMENT") {
    return NextResponse.json({ error: "این کالا قبلاً به مرکز ارسال شده است." }, { status: 400 });
  }

  await prisma.orderItem.update({ where: { id: item.id }, data: { hubStatus: "RECEIVED_AT_HUB" } });

  return NextResponse.json({ ok: true });
}
