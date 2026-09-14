import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getStorageProvider } from "@/lib/providers/storage";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Separate from /api/seller/uploads on purpose: this one is for the registration wizard itself
// (shop avatar, business license photo), used before a SellerProfile even exists - gating it on
// requireApprovedSeller() like the product-photo upload route would lock out every applicant
// before they're even PENDING. Any logged-in user is the correct bar here, matching
// /api/seller/register's own gate. See docs/decisions.md ADR 29.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ابتدا وارد شوید.", requiresAuth: true }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "فایلی ارسال نشده است." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "فقط تصاویر jpg، png یا webp مجاز است." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "حجم تصویر نباید بیشتر از ۵ مگابایت باشد." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { url } = await getStorageProvider().save({
    buffer,
    fileName: file.name,
    contentType: file.type,
  });

  return NextResponse.json({ ok: true, url });
}
