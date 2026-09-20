import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedProvider } from "@/lib/auth/provider";

type Params = { params: Promise<{ id: string }> };

/// Deletes one of this provider's own portfolio photos (docs/decisions.md ADR 43) - scoped to
/// providerId in the where clause so a provider can never delete another provider's image by id.
export async function DELETE(_request: Request, { params }: Params) {
  const provider = await requireApprovedProvider();
  if (!provider) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const result = await prisma.providerPortfolioImage.deleteMany({
    where: { id, providerId: provider.id },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "تصویر پیدا نشد." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
