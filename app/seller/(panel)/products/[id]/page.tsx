import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { ProductForm } from "@/components/seller/ProductForm";
import { DeleteProductButton } from "@/components/seller/DeleteProductButton";
import { getSellerProfile } from "@/lib/auth/seller";
import { getSellerProductById, parseProductImages } from "@/lib/data/seller";
import { getActiveCities, getActiveProductCategories } from "@/lib/data/catalog";
import { toNumber } from "@/lib/decimal";

export const metadata: Metadata = {
  title: "ویرایش محصول",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }> };

export default async function EditSellerProductPage({ params }: Props) {
  const { id } = await params;
  // Never null here: the (panel) layout already redirected/blocked every other case before
  // rendering this page.
  const profile = (await getSellerProfile())!;
  const product = await getSellerProductById(profile.id, id);
  if (!product) notFound();

  const [cities, categories] = await Promise.all([getActiveCities(), getActiveProductCategories()]);

  return (
    <main className="flex flex-1 flex-col">
      <TopBar title="ویرایش محصول" backHref="/seller/products" />
      <ProductForm
        cities={cities.map((city) => ({ id: city.id, name: city.name }))}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        product={{
          id: product.id,
          title: product.title,
          description: product.description,
          categoryId: product.categoryId,
          cityId: product.cityId,
          price: toNumber(product.price),
          discountPrice: product.discountPrice ? toNumber(product.discountPrice) : null,
          stock: product.stock,
          images: parseProductImages(product.images),
          isActive: product.isActive,
        }}
      />
      <DeleteProductButton productId={product.id} />
    </main>
  );
}
