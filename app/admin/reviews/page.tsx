import type { Metadata } from "next";
import { MessageSquareWarning, Star } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { ApproveButton } from "@/components/admin/ApproveButton";
import { getPendingReviews } from "@/lib/data/reviews";

export const metadata: Metadata = {
  title: "نظرات در انتظار تایید",
  robots: { index: false, follow: false },
};

// A review's own approval status changes whenever this very page approves/rejects one - never
// cached/frozen at build time, same reasoning as every other admin queue page in this app.
export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const reviews = await getPendingReviews();

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-5">
      <TopBar title="نظرات در انتظار تایید" />

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
          <MessageSquareWarning className="h-6 w-6 text-charcoal-muted" strokeWidth={1.5} />
          <p className="text-sm text-charcoal-muted">نظری در انتظار تایید نیست.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((review) => (
            <li key={review.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-charcoal">
                  {review.product?.title ?? review.serviceOffering?.title ?? "—"}
                </p>
                <span className="flex items-center gap-1 text-gold-600">
                  <Star className="h-3.5 w-3.5 fill-current" strokeWidth={1.5} />
                  {review.rating.toLocaleString("fa-IR")}
                </span>
              </div>
              <p className="text-xs text-charcoal-muted">
                {review.user.name ?? "کاربر ویورا"} ·{" "}
                {new Date(review.createdAt).toLocaleDateString("fa-IR")}
              </p>
              {review.comment ? <p className="leading-6 text-charcoal">{review.comment}</p> : null}
              <div className="mt-1 flex flex-col gap-2">
                <ApproveButton endpoint={`/api/admin/reviews/${review.id}/approve`} label="تایید" />
                <ApproveButton
                  endpoint={`/api/admin/reviews/${review.id}/reject`}
                  label="رد کردن"
                  variant="secondary"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
