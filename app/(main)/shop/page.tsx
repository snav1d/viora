import type { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { getActiveProductCategories } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "فروشگاه",
  description: "لوازم تولد و جشن از فروشنده‌های معتبر تهران.",
};

// Category list is admin-editable (isActive phase toggle) and must never be frozen at build time.
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const categories = await getActiveProductCategories();

  return (
    <main className="flex flex-1 flex-col">
      <TopBar title="فروشگاه" backHref="/home" />
      <div className="flex flex-col gap-3 px-4 py-5">
        <p className="text-sm text-charcoal-muted">یک دسته‌بندی را انتخاب کنید.</p>
        <CategoryGrid categories={categories} />
      </div>
    </main>
  );
}
