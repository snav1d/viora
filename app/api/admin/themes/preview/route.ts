import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth/admin";
import { THEME_PREVIEW_COOKIE } from "@/lib/data/theme";

/// Ends whatever theme preview is active for this admin's own browser (lib/data/theme.ts's
/// getEffectiveTheme). A static route, not nested under [id], since exiting preview never needs
/// to name a theme.
export async function DELETE() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.delete(THEME_PREVIEW_COOKIE);
  return NextResponse.json({ ok: true });
}
