import type { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { ProductForm } from "@/components/seller/ProductForm";
import { getActiveCities, getActiveProductCategories } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "افزودن محصول",
  robots: { index: false, follow: false },
};

export default async function NewSellerProductPage() {
  const [cities, categories] = await Promise.all([getActiveCities(), getActiveProductCategories()]);

  return (
    <main className="flex flex-1 flex-col">
      <TopBar title="افزودن محصول" backHref="/seller/products" />
      <ProductForm
        cities={cities.map((city) => ({ id: city.id, name: city.name }))}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
      />
    </main>
  );
}
