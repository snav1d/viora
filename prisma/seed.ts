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
import { SIMPLE_SERVICE_CATEGORIES } from "../lib/serviceCategories";

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
    categoryId: balloonPrintingCategory.id,
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

  // Every registered provider now needs at least MIN_REGISTRATION_PORTFOLIO_IMAGES portfolio
  // photos (docs/decisions.md ADR 44 item 4, applies to print too) - reusing the existing avatar
  // SVG set as stand-in work-sample images, the same "reuse an existing fixture asset" convention
  // this script already uses for businessLicenseImageUrl above. Deleted and recreated per
  // provider on every re-run, same idempotent-reseed reasoning as the print pricing tiers below.
  async function seedPortfolio(providerId: string, avatarIndexes: number[]) {
    await prisma.providerPortfolioImage.deleteMany({ where: { providerId } });
    await prisma.providerPortfolioImage.createMany({
      data: avatarIndexes.map((index) => ({ providerId, imageUrl: DEFAULT_AVATARS[index].url })),
    });
  }
  await seedPortfolio(providerProfile.id, [10, 11, 0, 1, 2]);

  const fixtureProducts = productsSeedData as Array<{
    title: string;
    categorySlug: string;
    price: number;
    description: string;
    slug: string;
  }>;

  // Deleting first (rather than upserting each row) is what makes this re-runnable as the real
  // catalog changes shape over time: the original Sprint 0 sample set (10 generic products, no
  // theme/category realism) is entirely superseded by prisma/seed-data/products.json's 500 real
  // titles, and re-running this script should never leave both around side by side. Listing is
  // deleted before its parent Product (docs/decisions.md ADR 39); safe against existing OrderItem
  // rows referencing these products either way - see the schema's generated migration:
  // `OrderItem_productId_fkey ... ON DELETE SET NULL` (Prisma's default for this optional
  // relation), so deleting a Product nulls out the FK on any OrderItem instead of failing or
  // cascading the delete into order history. Not scoped to sellerProfile.id: ADR 39's own
  // "claim an existing catalog product" flow lets ANY seller hold a Listing against a fixture
  // product, and Listing_productId_fkey is RESTRICT (unlike OrderItem/Review's SET NULL) - since
  // the fixture Product row itself is unconditionally destroyed and recreated below, every
  // Listing against it must go first, regardless of which seller created it.
  const fixtureSlugs = fixtureProducts.map((product) => product.slug);
  await prisma.listing.deleteMany({
    where: { product: { slug: { in: fixtureSlugs } } },
  });
  await prisma.product.deleteMany({ where: { slug: { in: fixtureSlugs } } });

  // This fixture catalog enters pre-approved with a fixed, deterministic VP-code range
  // (VP10001..VP10500) rather than going through ProductCodeCounter (docs/decisions.md ADR 39) -
  // re-running this idempotent delete+recreate script must reproduce the exact same codes every
  // time, not burn through the shared counter a little further on every `db:seed`. themeSlug in
  // the source file isn't a Product column (ADR 22 - no structured theme field exists, matching
  // is text-based against title/description, which already names the theme in Persian).
  for (const [index, product] of fixtureProducts.entries()) {
    const created = await prisma.product.create({
      data: {
        categoryId: productCategories[product.categorySlug].id,
        title: product.title,
        slug: product.slug,
        description: product.description,
        images: [],
        code: `VP${10001 + index}`,
        status: "APPROVED",
      },
    });
    await prisma.listing.create({
      data: {
        productId: created.id,
        sellerId: sellerProfile.id,
        cityId: tehran.id,
        price: product.price,
        stock: 25,
        isActive: true,
      },
    });
  }

  // Keep ProductCodeCounter clear of the fixture's own fixed range so the first real admin
  // approval in a freshly-seeded dev DB can never collide with a VP10001..VP10500 fixture code.
  const codeFloor = 10000 + fixtureProducts.length;
  const existingCounter = await prisma.productCodeCounter.findUnique({ where: { id: "singleton" } });
  if (!existingCounter) {
    await prisma.productCodeCounter.create({ data: { id: "singleton", value: codeFloor } });
  } else if (existingCounter.value < codeFloor) {
    await prisma.productCodeCounter.update({ where: { id: "singleton" }, data: { value: codeFloor } });
  }

  // The admin-curated print-color catalog (docs/decisions.md ADR 32) - the same names the
  // seeded offering below selects from, so seed data stays internally consistent.
  const seedPrintColors = ["قرمز", "آبی", "طلایی", "نقره‌ای", "سفید", "مشکی"];
  await Promise.all(
    seedPrintColors.map((name) =>
      prisma.printColor.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );

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

  // Two new SERVICE categories, using the same ServiceProviderProfile as print but NOT its
  // pricing-tier/color/finish structure: a "simple" category provider self-manages any number of
  // independently titled/described/priced ServiceOfferings from their own panel, any time, with
  // no admin review per offering (docs/decisions.md ADR 44, superseding ADR 43's single
  // fixed-package-at-registration model). Slugs/labels come from lib/serviceCategories.ts so seed
  // data and app code never drift apart.
  const [balloonDecorDef, photographyDef] = SIMPLE_SERVICE_CATEGORIES;
  const balloonDecorCategory = await prisma.category.upsert({
    where: { slug: balloonDecorDef.slug },
    update: { isActive: true },
    create: { name: balloonDecorDef.label, slug: balloonDecorDef.slug, type: "SERVICE", isActive: true, sortOrder: 1 },
  });
  const photographyCategory = await prisma.category.upsert({
    where: { slug: photographyDef.slug },
    update: { isActive: true },
    create: { name: photographyDef.label, slug: photographyDef.slug, type: "SERVICE", isActive: true, sortOrder: 2 },
  });

  const balloonDecorUser = await prisma.user.upsert({
    where: { phone: "09120000003" },
    update: {},
    create: { phone: "09120000003", name: "بادکنک‌آرایی رویا", roles: ["SERVICE_PROVIDER"] },
  });
  const balloonDecorProviderFields = {
    categoryId: balloonDecorCategory.id,
    businessName: "بادکنک‌آرایی رویا",
    businessLicenseImageUrl: "/avatars/avatar-03.svg",
    nationalId: "3333333333",
    bankAccountIban: "IR000000000000000000000003",
    commissionRate: 12.5,
    status: "APPROVED" as const,
  };
  const balloonDecorProvider = await prisma.serviceProviderProfile.upsert({
    where: { userId: balloonDecorUser.id },
    update: balloonDecorProviderFields,
    create: { userId: balloonDecorUser.id, ...balloonDecorProviderFields },
  });
  await seedPortfolio(balloonDecorProvider.id, [0, 1, 2, 3, 4]);
  const balloonDecorOfferings = [
    {
      slug: "roya-balloon-decor-standard",
      title: "بادکنک‌آرایی تم استاندارد",
      description: "اجرای بادکنک‌آرایی حرفه‌ای برای جشن تولد و مراسم، شامل طراحی و اجرای کامل در محل.",
      basePrice: 3500000,
    },
    {
      slug: "roya-balloon-decor-barbie",
      title: "بادکنک‌آرایی تم باربی",
      description: "تم اختصاصی باربی با ترکیب رنگ صورتی/طلایی، شامل بک‌دراپ و آرایش کامل سالن.",
      basePrice: 4200000,
    },
    {
      slug: "roya-balloon-decor-arch",
      title: "آرک بادکنک ورودی",
      description: "اجرای آرک بادکنک برای ورودی مراسم، قابل‌سفارش به‌صورت جداگانه از سایر خدمات.",
      basePrice: 1800000,
    },
  ];
  for (const offering of balloonDecorOfferings) {
    await prisma.serviceOffering.upsert({
      where: { slug: offering.slug },
      update: { title: offering.title, description: offering.description, basePrice: offering.basePrice, isActive: true },
      create: {
        providerId: balloonDecorProvider.id,
        categoryId: balloonDecorCategory.id,
        cityId: tehran.id,
        title: offering.title,
        slug: offering.slug,
        description: offering.description,
        basePrice: offering.basePrice,
        isActive: true,
      },
    });
  }

  const photographerUser = await prisma.user.upsert({
    where: { phone: "09120000004" },
    update: {},
    create: { phone: "09120000004", name: "استودیو عکس آرمان", roles: ["SERVICE_PROVIDER"] },
  });
  const photographerProviderFields = {
    categoryId: photographyCategory.id,
    businessName: "استودیو عکس آرمان",
    businessLicenseImageUrl: "/avatars/avatar-04.svg",
    nationalId: "4444444444",
    bankAccountIban: "IR000000000000000000000004",
    commissionRate: 12.5,
    status: "APPROVED" as const,
  };
  const photographerProvider = await prisma.serviceProviderProfile.upsert({
    where: { userId: photographerUser.id },
    update: photographerProviderFields,
    create: { userId: photographerUser.id, ...photographerProviderFields },
  });
  await seedPortfolio(photographerProvider.id, [5, 6, 7, 8, 9]);
  const photographyOfferings = [
    {
      slug: "arman-photography-standard",
      title: "پکیج عکاسی ۴ ساعته",
      description: "پوشش عکاسی حرفه‌ای مراسم به مدت ۴ ساعت، شامل ۵۰ قطعه عکس ادیت‌شده و تحویل فایل نهایی.",
      basePrice: 6500000,
    },
    {
      slug: "arman-photography-6h",
      title: "پکیج عکاسی ۶ ساعته",
      description: "پوشش عکاسی حرفه‌ای مراسم به مدت ۶ ساعت، شامل ۸۰ قطعه عکس ادیت‌شده و تحویل فایل نهایی.",
      basePrice: 9000000,
    },
    {
      slug: "arman-videography",
      title: "پکیج فیلم‌برداری",
      description: "فیلم‌برداری کامل مراسم به همراه تدوین و تحویل فایل نهایی با کیفیت بالا.",
      basePrice: 7500000,
    },
  ];
  for (const offering of photographyOfferings) {
    await prisma.serviceOffering.upsert({
      where: { slug: offering.slug },
      update: { title: offering.title, description: offering.description, basePrice: offering.basePrice, isActive: true },
      create: {
        providerId: photographerProvider.id,
        categoryId: photographyCategory.id,
        cityId: tehran.id,
        title: offering.title,
        slug: offering.slug,
        description: offering.description,
        basePrice: offering.basePrice,
        isActive: true,
      },
    });
  }

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
    where: { key: "print_normal_turnaround_days" },
    update: {},
    create: { key: "print_normal_turnaround_days", value: { minDays: 3, maxDays: 5 } },
  });
  // The visual (non-automatic) return-rate warning threshold shown on a seller's admin profile -
  // docs/decisions.md ADR 38. Purely informational; nothing reads this to auto-suspend a seller.
  await prisma.platformSetting.upsert({
    where: { key: "seller_return_rate_warning_threshold" },
    update: {},
    create: { key: "seller_return_rate_warning_threshold", value: { percent: 10 } },
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
