import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

type Params = { params: Promise<{ id: string }> };

/// Unlike a rejected Product/seller/provider application, a rejected review has no lifecycle to
/// come back to - the customer isn't asked to "resubmit" a comment, so there's no reason to keep
/// a rejected row around. Rejecting one just deletes it (docs/decisions.md ADR 40).
export async function POST(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review || review.isApproved) {
    return NextResponse.json({ error: "این نظر در انتظار تایید نیست." }, { status: 400 });
  }

  await prisma.review.delete({ where: { id: review.id } });

  return NextResponse.json({ ok: true });
}
