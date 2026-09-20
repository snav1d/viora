import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedProvider } from "@/lib/auth/provider";
import { storageUrlSchema } from "@/lib/validation/url";
import { MAX_PORTFOLIO_IMAGES } from "@/lib/data/provider";

const bodySchema = z.object({ imageUrl: storageUrlSchema });

/// Adds one already-uploaded (via /api/provider/portfolio/uploads) photo to the provider's own
/// "پورتفولیو" (docs/decisions.md ADR 43) - capped at MAX_PORTFOLIO_IMAGES, checked here rather
/// than in the schema since Prisma has no row-count constraint.
export async function POST(request: Request) {
  const provider = await requireApprovedProvider();
  if (!provider) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "آدرس تصویر نامعتبر است." }, { status: 400 });
  }

  const count = await prisma.providerPortfolioImage.count({ where: { providerId: provider.id } });
  if (count >= MAX_PORTFOLIO_IMAGES) {
    return NextResponse.json(
      { error: `حداکثر ${MAX_PORTFOLIO_IMAGES.toLocaleString("fa-IR")} تصویر در پورتفولیو مجاز است.` },
      { status: 400 },
    );
  }

  const image = await prisma.providerPortfolioImage.create({
    data: { providerId: provider.id, imageUrl: parsed.data.imageUrl },
  });

  return NextResponse.json({ ok: true, image });
}
