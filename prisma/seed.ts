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
  const sellerProfile = await prisma.sellerProfile.upsert({
    where: { userId: sellerUser.id },
    update: {},
    create: {
      userId: sellerUser.id,
      businessName: "فروشگاه جشن پارسا",
      nationalId: "1111111111",
      bankAccountIban: "IR000000000000000000000001",
      cityId: tehran.id,
      status: "APPROVED",
    },
  });

  const providerUser = await prisma.user.upsert({
    where: { phone: "09120000002" },
    update: {},
    create: { phone: "09120000002", name: "چاپخانه گلرنگ", roles: ["SERVICE_PROVIDER"] },
  });
  const providerProfile = await prisma.serviceProviderProfile.upsert({
    where: { userId: providerUser.id },
    update: {},
    create: {
      userId: providerUser.id,
      businessName: "چاپخانه گلرنگ",
      nationalId: "2222222222",
      bankAccountIban: "IR000000000000000000000002",
      commissionRate: 12.5,
      status: "APPROVED",
    },
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

  await prisma.serviceOffering.upsert({
    where: { slug: "promo-balloon-print-standard" },
    update: {},
    create: {
      providerId: providerProfile.id,
      categoryId: balloonPrintingCategory.id,
      cityId: tehran.id,
      title: "چاپ بادکنک لاتکس تبلیغاتی (حداقل تیراژ ۱۰۰ عدد)",
      slug: "promo-balloon-print-standard",
      description: "چاپ یک‌رنگ یا چندرنگ روی بادکنک لاتکس، مناسب افتتاحیه و رویدادهای شرکتی.",
      basePrice: 5700,
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
