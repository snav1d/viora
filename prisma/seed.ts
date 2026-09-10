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

  const products: Array<{ slug: string; title: string; price: number; categorySlug: string }> = [
    { slug: "balloon-arch-gold-rose", title: "آرک بادکنک طلایی-رزگلد", price: 1850000, categorySlug: "balloons-decor" },
    { slug: "latex-balloon-pack-100", title: "بسته ۱۰۰ عددی بادکنک لاتکس", price: 220000, categorySlug: "balloons-decor" },
    { slug: "foil-number-balloon", title: "بادکنک فویلی عدد تولد", price: 95000, categorySlug: "balloons-decor" },
    { slug: "party-backdrop-unicorn", title: "بک‌دراپ تم یونیکورن", price: 690000, categorySlug: "balloons-decor" },
    { slug: "disposable-set-32pc", title: "ست ظروف یک‌بارمصرف ۳۲ نفره", price: 480000, categorySlug: "disposable-tableware" },
    { slug: "paper-cups-theme-pack", title: "بسته لیوان کاغذی تم‌دار", price: 120000, categorySlug: "disposable-tableware" },
    { slug: "birthday-cake-1kg", title: "کیک تولد ۱ کیلویی", price: 950000, categorySlug: "cake-sweets" },
    { slug: "cake-topper-candle-set", title: "ست تاپر و شمع کیک", price: 165000, categorySlug: "cake-sweets" },
    { slug: "guest-gift-box-small", title: "جعبه کادو مهمان (کوچک)", price: 85000, categorySlug: "guest-gifts" },
    { slug: "party-hat-mask-set", title: "ست کلاه و نقاب جشن", price: 140000, categorySlug: "costume-accessories" },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        sellerId: sellerProfile.id,
        categoryId: productCategories[product.categorySlug].id,
        cityId: tehran.id,
        title: product.title,
        slug: product.slug,
        description: `${product.title} — مناسب برای جشن تولد، ارسال به سراسر تهران.`,
        price: product.price,
        stock: 25,
        images: [],
        isActive: true,
      },
    });
  }

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
