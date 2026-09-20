import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { StarRating } from "@/components/reviews/StarRating";
import { getSession } from "@/lib/auth/session";
import { getProviderProfileForCustomer } from "@/lib/data/services";
import { getProviderReviewSummary } from "@/lib/data/reviews";
import { SIMPLE_SERVICE_CATEGORIES } from "@/lib/serviceCategories";

type Props = { params: Promise<{ category: string; providerId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, providerId } = await params;
  const categoryDef = SIMPLE_SERVICE_CATEGORIES.find((c) => c.servicePath === `/services/${category}`);
  if (!categoryDef) return { title: "پروفایل پارتنر" };
  const provider = await getProviderProfileForCustomer(providerId, categoryDef.slug);
  return {
    title: provider ? provider.businessName : "پروفایل پارتنر",
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function ServiceProviderProfilePage({ params }: Props) {
  const { category, providerId } = await params;
  const categoryDef = SIMPLE_SERVICE_CATEGORIES.find((c) => c.servicePath === `/services/${category}`);
  if (!categoryDef) notFound();

  const session = await getSession();
  if (!session) {
    redirect(`/auth?redirect=${encodeURIComponent(`/services/${category}/${providerId}`)}`);
  }

  const provider = await getProviderProfileForCustomer(providerId, categoryDef.slug);
  if (!provider) notFound();

  const reviews = await getProviderReviewSummary(provider.providerId);

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 py-5">
      <TopBar title={provider.businessName} backHref={categoryDef.servicePath} />

      <div className="flex items-center gap-2">
        {provider.isVerifiedByViora ? (
          <span className="flex items-center gap-1 rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-medium text-gold-600">
            <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2} />
            تاییدیه‌ی ویژه‌ی ویورا
          </span>
        ) : null}
        {reviews.count > 0 ? (
          <div className="flex items-center gap-1.5 text-sm text-charcoal-muted">
            <StarRating rating={Math.round(reviews.average ?? 0)} />
            <span>({reviews.count.toLocaleString("fa-IR")})</span>
          </div>
        ) : null}
      </div>

      {provider.portfolioImages.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-charcoal">نمونه‌کار</h2>
          <div className="grid grid-cols-3 gap-1.5">
            {provider.portfolioImages.map((image) => (
              // eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URL, not a local /public asset
              <img key={image} src={image} alt="نمونه‌کار" className="aspect-square w-full rounded-xl object-cover" />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-charcoal">خدمات</h2>
        {provider.offerings.length === 0 ? (
          <p className="py-6 text-center text-sm text-charcoal-muted">این پارتنر فعلاً خدمتی ثبت نکرده است.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {provider.offerings.map((offering) => (
              <li key={offering.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
                <p className="font-medium text-charcoal">{offering.title}</p>
                {offering.description ? <p className="text-charcoal-muted">{offering.description}</p> : null}
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-rose-700">{offering.price.toLocaleString("fa-IR")} تومان</p>
                  <Link
                    href={`/services/${categoryDef.slug}/${provider.providerId}/book/${offering.id}`}
                    className="rounded-full bg-gold-500 px-4 py-2 text-xs font-medium text-charcoal hover:bg-gold-600"
                  >
                    سفارش
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {reviews.count > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-charcoal">نظرات مشتریان</h2>
          <ul className="flex flex-col gap-3">
            {reviews.reviews.map((review) => (
              <li key={review.id} className="space-y-1 rounded-2xl border border-border bg-surface p-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-charcoal">{review.userName}</p>
                  <StarRating rating={review.rating} />
                </div>
                {review.comment ? <p className="text-charcoal-muted">{review.comment}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
