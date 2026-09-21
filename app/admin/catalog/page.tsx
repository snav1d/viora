import type { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { ActiveToggle } from "@/components/admin/ActiveToggle";
import { PrintColorManager } from "@/components/admin/PrintColorManager";
import { CategoryCommissionInput } from "@/components/admin/CategoryCommissionInput";
import { getAllCities, getAllCategories, getAllPrintColors } from "@/lib/data/admin";
import { toNumber } from "@/lib/decimal";
import type { CategoryType } from "@/lib/generated/prisma/client";

export const metadata: Metadata = {
  title: "شهر و دسته‌بندی",
  robots: { index: false, follow: false },
};

// This page's whole purpose is to replace direct-DB editing of City.isActive/Category.isActive
// (docs/README.md §4) with a real UI - it must always reflect the current DB state, never a
// build-time snapshot.
export const dynamic = "force-dynamic";

const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  PARTY_TYPE: "نوع جشن",
  PRODUCT: "محصول",
  SERVICE: "خدمت",
};

export default async function AdminCatalogPage() {
  const [cities, categories, printColors] = await Promise.all([
    getAllCities(),
    getAllCategories(),
    getAllPrintColors(),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-5">
      <TopBar title="شهر و دسته‌بندی" />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-charcoal">شهرها</h2>
        <ul className="flex flex-col gap-2">
          {cities.map((city) => (
            <li
              key={city.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 text-sm"
            >
              <span className="font-medium text-charcoal">{city.name}</span>
              <ActiveToggle id={city.id} isActive={city.isActive} kind="cities" />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-charcoal">دسته‌بندی‌ها</h2>
        <ul className="flex flex-col gap-2">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 text-sm"
            >
              <div className="space-y-1.5">
                <p className="font-medium text-charcoal">{category.name}</p>
                <p className="text-xs text-charcoal-muted">
                  {CATEGORY_TYPE_LABELS[category.type]}
                </p>
                {category.type === "SERVICE" ? (
                  <CategoryCommissionInput
                    id={category.id}
                    defaultCommissionRate={
                      category.defaultCommissionRate ? toNumber(category.defaultCommissionRate) : null
                    }
                  />
                ) : null}
              </div>
              <ActiveToggle id={category.id} isActive={category.isActive} kind="categories" />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-charcoal">رنگ‌های چاپ</h2>
        <PrintColorManager colors={printColors} />
      </section>
    </main>
  );
}
