"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Sparkles, Handshake } from "lucide-react";
import { ProgressDots } from "@/components/ui/ProgressDots";

const SLIDES = [
  {
    icon: ShoppingBag,
    title: "خرید از فروشگاه ویورا",
    description: "لوازم تولد و جشن از فروشنده‌های معتبر تهران، همه‌جا یک‌جا.",
  },
  {
    icon: Sparkles,
    title: "جشن‌ساز، دستیار جشن شما",
    description: "سن، تعداد مهمان، بودجه و تم رو بگید تا یک سبد پیشنهادی کامل بسازیم.",
  },
  {
    icon: Handshake,
    title: "خدمات و پارتنرهای ویورا",
    description: "از چاپ بادکنک تبلیغاتی شروع می‌کنیم؛ به‌زودی خدمات بیشتر اضافه می‌شه.",
  },
];

export function OnboardingCarousel() {
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const isLast = index === SLIDES.length - 1;
  const Slide = SLIDES[index];

  function next() {
    if (isLast) {
      router.push("/auth");
      return;
    }
    setIndex((i) => i + 1);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-between px-6 py-10 text-center">
      <button
        onClick={() => router.push("/auth")}
        className="self-start text-sm text-charcoal-muted underline-offset-4 hover:underline"
      >
        رد شدن
      </button>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <Slide.icon className="h-12 w-12" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-charcoal">{Slide.title}</h1>
          <p className="mx-auto max-w-xs text-sm leading-6 text-charcoal-muted">
            {Slide.description}
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col items-center gap-6">
        <ProgressDots total={SLIDES.length} current={index + 1} />
        <button
          onClick={next}
          className="h-11 w-full rounded-full bg-gold-500 px-5 text-sm font-medium text-charcoal transition-colors hover:bg-gold-600"
        >
          {isLast ? "شروع کن" : "بعدی"}
        </button>
      </div>
    </div>
  );
}
