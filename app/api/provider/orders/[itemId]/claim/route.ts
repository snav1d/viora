import { NextResponse } from "next/server";
import { requireApprovedProvider } from "@/lib/auth/provider";
import { claimReassignmentItem } from "@/lib/data/print";

type Params = { params: Promise<{ itemId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const provider = await requireApprovedProvider();
  if (!provider) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { itemId } = await params;
  const result = await claimReassignmentItem(provider.id, itemId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
