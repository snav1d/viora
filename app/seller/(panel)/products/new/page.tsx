import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { ProductForm } from "@/components/seller/ProductForm";
import { getActiveCities, getActiveProductCategories } from "@/lib/data/catalog";
import { getSellerProfile } from "@/lib/auth/seller";

export const metadata: Metadata = {
  title: "افزودن محصول",
  robots: { index: false, follow: false },
};

export default async function NewSellerProductPage() {
  // Never null here: the (panel) layout already redirected/blocked every other case before
  // rendering this page. A SUSPENDED seller can still reach every other seller page, but not
  // this one - docs/decisions.md ADR 38.
  const profile = (await getSellerProfile())!;
  if (profile.status !== "APPROVED") {
    redirect("/seller/products");
  }

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
