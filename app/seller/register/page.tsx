import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSellerProfile } from "@/lib/auth/seller";
import { getActiveProductCategories } from "@/lib/data/catalog";
import { SellerRegisterWizard } from "@/components/seller/SellerRegisterWizard";

export const metadata: Metadata = {
  title: "ثبت‌نام فروشنده",
  robots: { index: false, follow: false },
};

// Active categories are an admin-editable phase toggle and must never be frozen at build time -
// same reasoning as the party wizard page (docs/decisions.md).
export const dynamic = "force-dynamic";

export default async function SellerRegisterPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth?redirect=%2Fseller%2Fregister");
  }

  const existingProfile = await getSellerProfile();
  if (existingProfile) {
    redirect("/seller");
  }

  const categories = await getActiveProductCategories();

  return (
    <main className="flex flex-1 flex-col">
      <SellerRegisterWizard
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
      />
    </main>
  );
}
