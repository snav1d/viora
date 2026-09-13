import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { getSession } from "@/lib/auth/session";
import { getSellerProfile } from "@/lib/auth/seller";
import { getActiveCities, getActiveProductCategories } from "@/lib/data/catalog";
import { SellerRegisterForm } from "@/components/seller/SellerRegisterForm";

export const metadata: Metadata = {
  title: "ثبت‌نام فروشنده",
  robots: { index: false, follow: false },
};

// Active cities/categories are admin-editable phase toggles and must never be frozen at build
// time - same reasoning as the wizard page (docs/decisions.md).
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

  const [cities, categories] = await Promise.all([getActiveCities(), getActiveProductCategories()]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <TopBar title="ثبت‌نام فروشنده" backHref="/profile" />
      <SellerRegisterForm
        cities={cities.map((city) => ({ id: city.id, name: city.name }))}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
      />
    </main>
  );
}
