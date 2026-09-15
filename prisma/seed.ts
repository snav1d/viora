/**
 * Sprint 0 fake data: just enough for every page in docs/sprint-0-brief.md §5 to be
 * navigable with real (if fake) content. No orders are seeded — the profile page's order
 * history is meant to start empty per the DoD checklist.
 *
 * Run explicitly (Prisma v7 no longer auto-seeds): npm run db:seed
 */
import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import productsSeedData from "./seed-data/products.json";
import { DEFAULT_AVATARS } from "../lib/avatars";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const [tehran] = await Promise.all([
    prisma.city.upsert({
      where: { slug: "tehran" },
      update: { isActive: true },
      create: { name: "تهران", slug: "tehran", isActive: true },
    }),
    prisma.city.upsert({
      where: { slug: "mashhad" },
      update: {},
      create: { name: "مشهد", slug: "mashhad", isActive: false },
    }),
    prisma.city.upsert({
      where: { slug: "isfahan" },
      update: {},
      create: { name: "اصفهان", slug: "isfahan", isActive: false },
    }),
  ]);

  const birthday = await prisma.category.upsert({
    where: { slug: "birthday" },
    update: { isActive: true },
    create: { name: "تولد", slug: "birthday", type: "PARTY_TYPE", isActive: true, sortOrder: 1 },
  });
  await prisma.category.upsert({
    where: { slug: "engagement" },
    update: {},
    create: { name: "نامزدی و عقد", slug: "engagement", type: "PARTY_TYPE", isActive: false, sortOrder: 2 },
  });
  await prisma.category.upsert({
    where: { slug: "wedding" },
    update: {},
    create: { name: "عروسی", slug: "wedding", type: "PARTY_TYPE", isActive: false, sortOrder: 3 },
  });

  const productCategoryDefs = [
    { slug: "balloons-decor", name: "بادکنک‌آرایی و دکور" },
    { slug: "disposable-tableware", name: "ظروف یک‌بارمصرف" },
    { slug: "cake-sweets", name: "کیک و شیرینی" },
    { slug: "guest-gifts", name: "کادو مهمانان" },
    { slug: "costume-accessories", name: "لباس و اکسسوری" },
  ];

  const productCategories: Record<string, Awaited<ReturnType<typeof prisma.category.upsert>>> = {};
  for (const [index, def] of productCategoryDefs.entries()) {
    productCategories[def.slug] = await prisma.category.upsert({
      where: { slug: def.slug },
      update: { isActive: true },
      create: {
        name: def.name,
        slug: def.slug,
        type: "PRODUCT",
        parentId: birthday.id,
        isActive: true,
        sortOrder: index,
      },
    });
  }

  const balloonPrintingCategory = await prisma.category.upsert({
    where: { slug: "promotional-balloon-printing" },
    update: { isActive: true },
    create: {
      name: "چاپ بادکنک تبلیغاتی",
      slug: "promotional-balloon-printing",
      type: "SERVICE",
      isActive: true,
      sortOrder: 0,
    },
  });

  const sellerUser = await prisma.user.upsert({
    where: { phone: "09120000001" },
    update: {},
    create: { phone: "09120000001", name: "فروشگاه جشن پارسا", roles: ["SELLER"] },
  });
  const sellerProfileFields = {
    businessName: "فروشگاه جشن پارسا",
    description: "فروشگاه تخصصی لوازم جشن تولد، با تنوع بالا در بادکنک، ظروف، کیک و کادوی مهمانان.",
    avatarUrl: DEFAULT_AVATARS[0].url,
    nationalId: "1111111111",
    unionId: "9876543210",
    businessLicenseImageUrl: "/avatars/avatar-01.svg",
    bankAccountIban: "IR000000000000000000000001",
    cityId: tehran.id,
    address: "تهران، خیابان ولیعصر، بالاتر از میدان ونک، پلاک ۱۲۳",
    phoneNumbers: ["09120000001"],
    referralSource: "internet_social",
    termsAcceptedAt: new Date(),
    status: "APPROVED" as const,
  };
  const sellerProfile = await prisma.sellerProfile.upsert({
    where: { userId: sellerUser.id },
    // update mirrors create (not `{}`) so re-running this script backfills these fields onto a
    // SellerProfile row that already existed before they did - see docs/decisions.md ADR 29.
    update: sellerProfileFields,
    create: { userId: sellerUser.id, ...sellerProfileFields },
  });
  // The fixture seller's 500 products span all five product categories (see below), so it's
  // linked to all of them here too - the realistic case a multi-category shop selector exists
  // for in the first place. See docs/decisions.md ADR 29.
  await prisma.sellerCategory.createMany({
    data: Object.values(productCategories).map((category) => ({
      sellerProfileId: sellerProfile.id,
      categoryId: category.id,
    })),
    skipDuplicates: true,
  });

  const providerUser = await prisma.user.upsert({
    where: { phone: "09120000002" },
    update: {},
    create: { phone: "09120000002", name: "چاپخانه گلرنگ", roles: ["SERVICE_PROVIDER"] },
  });
  const providerProfileFields = {
    businessName: "چاپخانه گلرنگ",
    businessLicenseImageUrl: "/avatars/avatar-02.svg",
    nationalId: "2222222222",
    bankAccountIban: "IR000000000000000000000002",
    commissionRate: 12.5,
    status: "APPROVED" as const,
  };
  const providerProfile = await prisma.serviceProviderProfile.upsert({
    where: { userId: providerUser.id },
    // update mirrors create so re-running this script backfills businessLicenseImageUrl onto a
    // row that already existed before it did - same reasoning as SellerProfile's own upsert
    // (ADR 29).
    update: providerProfileFields,
    create: { userId: providerUser.id, ...providerProfileFields },
  });

  // Deleting first (rather than upserting each row) is what makes this re-runnable as the real
  // catalog changes shape over time: the original Sprint 0 sample set (10 generic products, no
  // theme/category realism) is entirely superseded by prisma/seed-data/products.json's 500 real
  // titles, and re-running this script should never leave both around side by side. Safe against
  // existing OrderItem rows referencing these products - see the schema's generated migration:
  // `OrderItem_productId_fkey ... ON DELETE SET NULL` (Prisma's default for this optional
  // relation), so deleting a Product nulls out the FK on any OrderItem instead of failing or
  // cascading the delete into order history.
  await prisma.product.deleteMany({ where: { sellerId: sellerProfile.id } });

  // themeSlug in the source file isn't a Product column (see docs/decisions.md ADR 22 - no
  // structured theme field exists, matching is text-based against title/description, which
  // already names the theme in Persian) - only the four real Product fields are used here.
  await prisma.product.createMany({
    data: (
      productsSeedData as Array<{
        title: string;
        categorySlug: string;
        price: number;
        description: string;
        slug: string;
      }>
    ).map((product) => ({
      sellerId: sellerProfile.id,
      categoryId: productCategories[product.categorySlug].id,
      cityId: tehran.id,
      title: product.title,
      slug: product.slug,
      description: product.description,
      price: product.price,
      stock: 25,
      images: [],
      isActive: true,
    })),
  });

  // Structured print settings supersede customFieldsSchema for this offering specifically - see
  // docs/decisions.md ADR 31. basePrice is set to the lowest tier's unitPrice (5700, the
  // 100-499 tier below) as a "starting from" display price - the real per-order price comes
  // from matching the requested quantity against the tiers, not this field.
  const balloonPrintOffering = await prisma.serviceOffering.upsert({
    where: { slug: "promo-balloon-print-standard" },
    update: { supportsChrome: true, supportsMatte: true, printableColors: ["قرمز", "آبی", "طلایی", "نقره‌ای", "سفید", "مشکی"], minOrderQuantity: 100 },
    create: {
      providerId: providerProfile.id,
      categoryId: balloonPrintingCategory.id,
      cityId: tehran.id,
      title: "چاپ بادکنک لاتکس تبلیغاتی (حداقل تیراژ ۱۰۰ عدد)",
      slug: "promo-balloon-print-standard",
      description: "چاپ یک‌رنگ یا چندرنگ روی بادکنک لاتکس، مناسب افتتاحیه و رویدادهای شرکتی.",
      basePrice: 5700,
      supportsChrome: true,
      supportsMatte: true,
      printableColors: ["قرمز", "آبی", "طلایی", "نقره‌ای", "سفید", "مشکی"],
      minOrderQuantity: 100,
      customFieldsSchema: {
        fields: [
          { key: "designFile", label: "فایل طرح", type: "file", required: true },
          { key: "runSize", label: "تیراژ", type: "number", required: true, min: 100 },
          { key: "balloonColor", label: "رنگ بادکنک", type: "select", required: true },
          { key: "notes", label: "توضیحات", type: "textarea", required: false },
        ],
      },
      isActive: true,
    },
  });

  // Deleted-and-recreated rather than upserted per row, same reasoning as the product reseed
  // above: re-running this script should always leave exactly this tier table, not accumulate
  // duplicates. Safe against existing orders - nothing references PrintPricingTier directly
  // (an OrderItem snapshots unitPrice/expressFee at order time, per docs/decisions.md ADR 31).
  await prisma.printPricingTier.deleteMany({ where: { serviceOfferingId: balloonPrintOffering.id } });
  await prisma.printPricingTier.createMany({
    data: [
      { serviceOfferingId: balloonPrintOffering.id, minQuantity: 100, maxQuantity: 499, unitPrice: 5700 },
      { serviceOfferingId: balloonPrintOffering.id, minQuantity: 500, maxQuantity: 999, unitPrice: 4900 },
      { serviceOfferingId: balloonPrintOffering.id, minQuantity: 1000, maxQuantity: null, unitPrice: 4200 },
    ],
  });

  await prisma.aiSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  await prisma.platformSetting.upsert({
    where: { key: "hub_min_days_before_event" },
    update: {},
    create: { key: "hub_min_days_before_event", value: { days: 2 } },
  });
  await prisma.platformSetting.upsert({
    where: { key: "partner_support_contact" },
    update: {},
    create: {
      key: "partner_support_contact",
      value: { phone: "02100000000", email: "support@viora.ir", telegram: "@viora_support" },
    },
  });
  // Print-partner delivery settings (docs/decisions.md ADR 31) - platform-wide, not per-partner:
  // the request's own wording only said pricing tiers/minimum quantity are partner-defined, not
  // the express fee or normal turnaround.
  await prisma.platformSetting.upsert({
    where: { key: "print_express_fee" },
    update: {},
    create: { key: "print_express_fee", value: { amount: 150000 } },
  });
  await prisma.platformSetting.upsert({
    where: { key: "print_normal_turnaround_text" },
    update: {},
    create: { key: "print_normal_turnaround_text", value: { text: "معمولاً ۳ تا ۵ روز کاری" } },
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
