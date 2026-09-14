import type { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";

export const metadata: Metadata = {
  title: "قوانین و شرایط همکاری با ویورا",
  robots: { index: false, follow: false },
};

// Content sourced from docs/legal-pages-draft.md §4 ("توافق‌نامه‌ی فروشنده/پارتنر") - a simple
// page for now, per the request that started this page (docs/decisions.md ADR 29), until a
// reviewed, dedicated seller-terms page exists.
const TERMS = [
  "فروشنده متعهد می‌شود اطلاعات محصول (قیمت، موجودی، توضیحات) را به‌روز و صحیح نگه دارد.",
  "فروشنده مسئول بسته‌بندی مناسب و ارسال به‌موقع طبق زمان اعلام‌شده است.",
  "عدم پایبندی مکرر به تعهدات (تاخیر، کیفیت پایین، لغو مکرر) می‌تواند به تعلیق حساب فروشنده منجر شود.",
  "اشتراک ماهانه/کمیسیون طبق پلن انتخابی در زمان ثبت‌نام محاسبه و کسر می‌شود.",
];

export default function SellerTermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <TopBar title="قوانین و شرایط همکاری" />
      <div className="flex flex-col gap-5 px-6 py-6">
        <p className="text-sm leading-7 text-charcoal-muted">
          با پیوستن به‌عنوان فروشنده به ویورا، شما با موارد زیر موافقت می‌کنید:
        </p>
        <ul className="flex flex-col gap-4">
          {TERMS.map((term, index) => (
            <li key={index} className="flex gap-3 text-sm leading-7 text-charcoal">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-100 text-xs font-semibold text-gold-600">
                {(index + 1).toLocaleString("fa-IR")}
              </span>
              <span>{term}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
