import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getStorageProvider } from "@/lib/providers/storage";

const MAX_BYTES = 15 * 1024 * 1024;
// Broader than the avatar/license upload routes on purpose: a real print-ready design file is
// commonly a PDF, not just a photo.
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

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
    return NextResponse.json({ error: "فقط فایل‌های jpg، png، webp یا pdf مجاز است." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "حجم فایل نباید بیشتر از ۱۵ مگابایت باشد." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { url } = await getStorageProvider().save({
    buffer,
    fileName: file.name,
    contentType: file.type,
  });

  return NextResponse.json({ ok: true, url });
}
