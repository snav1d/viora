# Sprint 0 — بریف اجرایی برای Claude Code
## پروژه: Viora (پلتفرم ساخت جشن) — نسخه‌ی اولیه اسکلت پروژه

> این سند مستقیم در اختیار Claude Code قرار می‌گیرد. هدف Sprint 0: ساخت **پایه‌ی فنی صحیح و قابل‌گسترش پروژه**، نه پیاده‌سازی فیچرهای نهایی.

---

## ۱. هدف این Sprint

راه‌اندازی اسکلت پروژه‌ای که:
- از روز اول ساختار درست SEO فنی داشته باشد
- معماری چندشهری/چنددسته‌بندی (config-driven) از پایه پشتیبانی شود، حتی اگر فعلاً فقط یک شهر/یک دسته فعال است
- پایه‌ی احراز هویت با شماره موبایل (OTP) آماده باشد
- ساختار پایگاه‌داده‌ی چندفروشنده‌ای (Marketplace) از ابتدا صحیح باشد
- پوسته‌ی بصری برند (Champagne Rose، لوکس، گرم) روی اسکلت ناوبری وایرفریم پیاده شود

**خارج از scope این Sprint (عمداً):** اتصال واقعی درگاه پرداخت/تسهیم، منطق کامل موتور جشن‌ساز، فرم چاپ بادکنک تبلیغاتی، پنل کامل ادمین. اینها در اسپرینت‌های بعدی می‌آیند — فقط جای خالی/اسکیمای آماده‌شون در دیتابیس گذاشته می‌شه.

---

## ۲. استک فنی

- **فریم‌ورک:** Next.js (App Router) + TypeScript
- **استایل:** Tailwind CSS
- **دیتابیس:** PostgreSQL
- **ORM:** Prisma
- **احراز هویت:** OTP پیامکی (ساختار آماده با provider قابل تعویض — فعلاً می‌تونه mock/console-log باشه تا provider واقعی SMS بعداً وصل بشه)
- **ذخیره‌سازی فایل:** لایه‌ی انتزاعی Storage Provider (فعلاً local/disk، بعداً S3-compatible)
- **پرداخت:** لایه‌ی انتزاعی PaymentProvider (فعلاً mock، بعداً PSP واقعی با قابلیت تسهیم وجوه)

---

## ۳. نصب و راه‌اندازی اولیه (قدم اول واقعی)

1. راه‌اندازی پروژه‌ی Next.js + TypeScript + Tailwind
2. تنظیم Git repository و push اولیه به GitHub
3. نصب Prisma و اتصال به PostgreSQL محلی (برای تست)
4. **نصب Skill سئو:**
   ```
   /plugin marketplace add AgriciDaniel/claude-seo
   /plugin install claude-seo@agricidaniel-claude-seo
   ```
   و رعایت کامل توصیه‌های فنی این skill (Schema.org، متادیتا، ساختار URL، عملکرد/Core Web Vitals، رندر سمت سرور) برای **هر صفحه‌ای که از این به بعد ساخته می‌شه**، نه فقط یک‌بار در پایان.

---

## ۴. مدل داده‌ی اولیه (Prisma Schema — سطح مفهومی)

| Entity | فیلدهای کلیدی | نکته |
|---|---|---|
| `User` | id, phone, role (customer/seller/service_provider/admin), createdAt | نقش چندگانه پشتیبانی بشه |
| `City` | id, name, isActive | برای فاز‌بندی جغرافیایی |
| `Category` | id, name, type (party_type / product / service), parentId, isActive | سلسله‌مراتبی، فاز‌پذیر |
| `SellerProfile` | id, userId, businessName, nationalId, bankAccount, status(pending/approved), subscriptionStatus | فروشنده‌ی محصول |
| `ServiceProviderProfile` | id, userId, businessName, nationalId, bankAccount, commissionRate, status | ارائه‌دهنده‌ی خدمت (چاپ بادکنک و بعداً بقیه) |
| `Product` | id, sellerId, categoryId, cityId, title, price, stock, images[] | |
| `ServiceOffering` | id, providerId, categoryId, cityId, title, basePrice, customFieldsSchema (JSON) | فیلدهای سفارشی برای هر خدمت (مثل تیراژ چاپ) |
| `PartyProfile` ⭐ | id, userId, partyType, ageGroup, guestCount, budget, cityId, theme, suggestedBundle (JSON), finalBundle (JSON), createdAt | هسته‌ی فلایویل داده — از همون اول همه‌ی تعاملات ذخیره بشه |
| `Order` | id, userId, status, totalAmount, createdAt | |
| `OrderItem` | id, orderId, productId?, serviceOfferingId?, sellerId/providerId, amount, splitAmount | چندفروشنده‌ای |
| `Subscription` | id, sellerId, plan, status, currentPeriodEnd | اشتراک ماهانه‌ی فروشنده‌ی محصول |

> فیلدهای دقیق‌تر (مثل customFieldsSchema برای چاپ بادکنک) در اسپرینت مربوطه تکمیل می‌شه.

---

## ۵. ساختار ناوبری و صفحات اولیه (بر اساس مرجع وایرفریم ضمیمه‌شده)

اسکلت صفحات (بدون منطق کامل، فقط layout + navigation صحیح):

1. **Splash / Onboarding** (۳ اسلاید معرفی: Shop / Build My Party / Services)
2. **Auth:** ورود با شماره موبایل → صفحه‌ی OTP
3. **Home:** ناوبری پایین با ۴ تب (خانه، جشن‌ساز، سبد، پروفایل)
4. **Shop:** گرید دسته‌بندی → لیست محصول → صفحه‌ی محصول
5. **Build My Party:** فرم پلکانی (چندمرحله‌ای با progress dots — سن → تعداد مهمان → بودجه → شهر → تم) → صفحه‌ی «نتیجه» (فعلاً placeholder، بدون منطق واقعی پیشنهاد)
6. **Cart / Checkout skeleton:** شامل انتخاب روش پرداخت (mock)
7. **Profile:** اطلاعات کاربر، تاریخچه‌ی سفارش (خالی)

**پوسته‌ی بصری:** رنگ‌بندی Champagne Rose (Warm White / Soft Rose / Champagne Gold / Charcoal Black)، فونت مدرن و خوانا، حس لوکس و گرم — نه شلوغ و کارتونی.

---

## ۶. معیار پذیرش (Definition of Done این Sprint)

- [ ] پروژه لوکال بالا می‌آید بدون خطا
- [ ] دیتابیس با Prisma migrate ساخته می‌شه و مدل‌های بالا موجودن
- [ ] ورود با شماره موبایل (OTP mock) کار می‌کنه
- [ ] تمام صفحات لیست‌شده در بخش ۵ قابل‌ناوبری‌اند (حتی با دیتای fake)
- [ ] پوسته‌ی رنگی Champagne Rose روی کل اپ اعمال شده
- [ ] Skill سئو نصب و طبق توصیه‌هاش صفحات ساخته شدن
- [ ] پروژه در GitHub push شده

---

## ۷. گام بعدی بعد از این Sprint

بعد از تایید Sprint 0، می‌ریم سراغ: منطق واقعی موتور جشن‌ساز (rule-based)، فرم دقیق چاپ بادکنک، و اتصال PSP واقعی برای پرداخت/تسهیم.
