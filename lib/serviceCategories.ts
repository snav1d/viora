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
    // Renamed from "عکاسی" (docs/decisions.md ADR 45) - videography needs no structural change
    // of its own, it's just a ServiceOffering a provider of this same category can already
    // create under whatever title they choose.
    slug: "photography",
    label: "عکاسی و فیلم‌برداری",
    registerPath: "/provider/register/photography",
    servicePath: "/services/photography",
  },
  // Five new categories, seeded isActive: false (docs/decisions.md ADR 45) - listed here already
  // so activating one later from /admin/catalog is genuinely the only step needed: registration,
  // browsing, and booking all already work off this same registry entry, with no further code
  // change or deploy required.
  {
    slug: "dj-live-music",
    label: "دی‌جی و موسیقی زنده",
    registerPath: "/provider/register/dj-live-music",
    servicePath: "/services/dj-live-music",
  },
  {
    slug: "catering-fingerfood",
    label: "کیترینگ و فینگرفود",
    registerPath: "/provider/register/catering-fingerfood",
    servicePath: "/services/catering-fingerfood",
  },
  {
    slug: "event-host",
    label: "مجری و گرداننده‌ی مراسم",
    registerPath: "/provider/register/event-host",
    servicePath: "/services/event-host",
  },
  {
    slug: "floral-decor",
    label: "گل‌آرایی و دکور گل",
    registerPath: "/provider/register/floral-decor",
    servicePath: "/services/floral-decor",
  },
  {
    slug: "bridal-beauty",
    label: "آرایش و شینیون عروس",
    registerPath: "/provider/register/bridal-beauty",
    servicePath: "/services/bridal-beauty",
  },
];

export function getSimpleServiceCategory(slug: string): SimpleServiceCategoryDef | undefined {
  return SIMPLE_SERVICE_CATEGORIES.find((category) => category.slug === slug);
}

/// Where any SERVICE category's own customer-facing browse page lives, print included - shared
/// by the home page's category grid and /services' own (docs/decisions.md ADR 45), so both stay
/// in sync from this one place. A future category needs only its own SIMPLE_SERVICE_CATEGORIES
/// entry, never a change here.
export function getServiceCategoryHref(slug: string): string {
  if (slug === PRINT_CATEGORY_SLUG) return "/print/partners";
  return getSimpleServiceCategory(slug)?.servicePath ?? `/services/${slug}`;
}
