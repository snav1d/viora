/// Central registry for the "simple" service-provider categories (docs/decisions.md ADR 43, 44) -
/// print (PRINT_CATEGORY_SLUG) is NOT listed here since it keeps its own dedicated
/// color/finish/pricing-tier structure (docs/decisions.md ADR 31), fully untouched by ADR 44's
/// multi-offering pivot. A "simple" category's provider creates any number of independently
/// titled/described/priced `ServiceOffering` rows from their own panel, anytime, with no admin
/// review per offering (docs/decisions.md ADR 44) - there is no fixed per-category package shape
/// anymore (ADR 43's "customFieldsSchema" idea is superseded).
///
/// No "server-only" here: this is plain data, safe to import from both server pages/routes and
/// client wizard components.

export const PRINT_CATEGORY_SLUG = "promotional-balloon-printing";

export type SimpleServiceCategoryDef = {
  slug: string;
  label: string;
  /// Route where a new partner of this type registers.
  registerPath: string;
  /// Customer-facing route listing active partners of this type.
  servicePath: string;
};

export const SIMPLE_SERVICE_CATEGORIES: SimpleServiceCategoryDef[] = [
  {
    slug: "balloon-decor-service",
    label: "بادکنک‌آرا",
    registerPath: "/provider/register/balloon-decor",
    servicePath: "/services/balloon-decor",
  },
  {
    slug: "photography",
    label: "عکاسی",
    registerPath: "/provider/register/photography",
    servicePath: "/services/photography",
  },
];

export function getSimpleServiceCategory(slug: string): SimpleServiceCategoryDef | undefined {
  return SIMPLE_SERVICE_CATEGORIES.find((category) => category.slug === slug);
}
