import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { THEME_PREVIEW_COOKIE } from "@/lib/data/theme";

type Params = { params: Promise<{ id: string }> };

/// Lets an admin see a theme applied across the whole site before it's public (or while it's
/// isActive=false) - only for their own browser, never other visitors. app/layout.tsx re-checks
/// requireAdmin() on every request rather than trusting this cookie alone (docs/decisions.md
/// ADR 36), so it's not httpOnly-sensitive in the security sense, just not something client code
/// needs to read directly.
export async function POST(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const { id } = await params;
  const theme = await prisma.seasonalTheme.findUnique({ where: { id } });
  if (!theme) {
    return NextResponse.json({ error: "تم پیدا نشد." }, { status: 404 });
  }

  const cookieStore = await cookies();
  cookieStore.set(THEME_PREVIEW_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 2,
  });

  return NextResponse.json({ ok: true });
}
