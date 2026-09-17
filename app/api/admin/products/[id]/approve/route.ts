import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

type Params = { params: Promise<{ id: string }> };

/// Assigns the real VP-prefixed catalog code and activates the submitting seller's Listing
/// together, in one step - the confirmed design (docs/decisions.md ADR 39) has no second stage
/// or need for the seller to come back once admin approves. The code comes from
/// ProductCodeCounter, a dedicated singleton row incremented atomically inside this transaction
/// (MySQL/InnoDB row-locks it for the transaction's duration, so concurrent approvals still get
/// distinct codes) - the same counter the split-migration seeded to continue right after the
/// pre-existing catalog's own sequentially-assigned codes.
export async function POST(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.status !== "PENDING_REVIEW") {
    return NextResponse.json({ error: "این محصول در انتظار بررسی نیست." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    const counter = await tx.productCodeCounter.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", value: 10001 },
      update: { value: { increment: 1 } },
    });
    await tx.product.update({
      where: { id: product.id },
      data: { status: "APPROVED", code: `VP${counter.value}`, rejectionReason: null },
    });
    await tx.listing.updateMany({ where: { productId: product.id }, data: { isActive: true } });
  });

  return NextResponse.json({ ok: true });
}
