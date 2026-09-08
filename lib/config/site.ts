export const siteConfig = {
  name: "ویورا",
  nameLatin: "Viora",
  tagline: "پلتفرم ساخت جشن — از ایده تا سبد خرید، در چند دقیقه",
  description:
    "ویورا با گرفتن چند پارامتر ساده (نوع جشن، تعداد مهمان، بودجه، شهر، تم) یک سبد پیشنهادی کامل از محصولات و خدمات واقعی برای جشن شما می‌سازد.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "fa_IR",
  themeColor: "#FAF6F2",
};

export type SiteConfig = typeof siteConfig;
