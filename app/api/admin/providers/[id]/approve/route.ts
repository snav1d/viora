import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const provider = await prisma.serviceProviderProfile.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!provider) {
    return NextResponse.json({ error: "پارتنر پیدا نشد." }, { status: 404 });
  }

  // approvedAt is only ever set once, on the FIRST approval (docs/decisions.md ADR 45) - a
  // provider that was somehow rejected and re-approved later keeps its original approvedAt (so
  // "تازه‌های ویورا" sorting stays honest) and, just as importantly, keeps whatever commissionRate
  // an admin may have manually set since then instead of silently resetting it back to the
  // category default below.
  const isFirstApproval = provider.approvedAt === null;

  // Offerings are created with isActive: false (see app/api/provider/register/route.ts) so a
  // PENDING provider's print listing can never surface to customers before approval - flip them
  // active here, alongside the profile status, as the one place that happens.
  await prisma.$transaction([
    prisma.serviceProviderProfile.update({
      where: { id },
      data: {
        status: "APPROVED",
        rejectionReason: null,
        approvedAt: provider.approvedAt ?? new Date(),
        ...(isFirstApproval && provider.category.defaultCommissionRate !== null
          ? { commissionRate: provider.category.defaultCommissionRate }
          : {}),
      },
    }),
    prisma.serviceOffering.updateMany({
      where: { providerId: id },
      data: { isActive: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
