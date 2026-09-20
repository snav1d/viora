/// Central registry for the "simple" service-provider categories (docs/decisions.md ADR 43) -
/// print (PRINT_CATEGORY_SLUG) is NOT listed here since it keeps its own dedicated
/// color/finish/pricing-tier structure (docs/decisions.md ADR 31). A "simple" category's
/// ServiceOffering is just basePrice, plus (for some categories) a fixed set of provider-set
/// customFieldsSchema values - a flat package the customer views and buys with no per-order
/// customization (ADR 43's confirmed "Option A").
///
/// No "server-only" here: this is plain data, safe to import from both server pages/routes and
/// client wizard components.

export const PRINT_CATEGORY_SLUG = "promotional-balloon-printing";

export type ServiceCustomFieldDef = {
  key: string;
  label: string;
};

export type SimpleServiceCategoryDef = {
  slug: string;
  label: string;
  /// Route where a new partner of this type registers.
  registerPath: string;
  /// Customer-facing route listing active partners of this type.
  servicePath: string;
  /// Fixed set of extra package attributes this category's partners set on their own
  /// ServiceOffering.customFieldsSchema - the provider fills in actual values (e.g. "4 hours"),
  /// never a form a customer fills at order time. Empty for a category with no extra attributes
  /// beyond basePrice.
  customFields: ServiceCustomFieldDef[];
};

export const SIMPLE_SERVICE_CATEGORIES: SimpleServiceCategoryDef[] = [
  {
    slug: "balloon-decor-service",
    label: "بادکنک‌آرا",
    registerPath: "/provider/register/balloon-decor",
    servicePath: "/services/balloon-decor",
    customFields: [],
  },
  {
    slug: "photography",
    label: "عکاسی",
    registerPath: "/provider/register/photography",
    servicePath: "/services/photography",
    customFields: [
      { key: "coverageHours", label: "تعداد ساعت پوشش" },
      { key: "editedPhotoCount", label: "تعداد عکس ادیت‌شده" },
    ],
  },
];

export function getSimpleServiceCategory(slug: string): SimpleServiceCategoryDef | undefined {
  return SIMPLE_SERVICE_CATEGORIES.find((category) => category.slug === slug);
}

/// Reads a simple category's customFieldsSchema back out as plain key -> number pairs for
/// display (admin detail page, customer service listing) - defensive against a null/malformed
/// value since Json columns carry no runtime type guarantee.
export function parseCustomFieldValues(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number",
  );
  return Object.fromEntries(entries);
}
