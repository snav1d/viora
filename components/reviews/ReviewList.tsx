import { MessageSquare } from "lucide-react";
import { StarRating } from "@/components/reviews/StarRating";
import type { ReviewSummary } from "@/lib/data/reviews";

export function ReviewList({ summary }: { summary: ReviewSummary }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-charcoal">نظرات مشتریان</h2>
        {summary.count > 0 ? (
          <div className="flex items-center gap-2 text-sm text-charcoal-muted">
            <StarRating rating={Math.round(summary.average ?? 0)} />
            <span>
              {summary.average!.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} از{" "}
              {summary.count.toLocaleString("fa-IR")} نظر
            </span>
          </div>
        ) : null}
      </div>

      {summary.count === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-8 text-center">
          <MessageSquare className="h-5 w-5 text-charcoal-muted" strokeWidth={1.5} />
          <p className="text-sm text-charcoal-muted">هنوز نظری ثبت نشده است.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {summary.reviews.map((review) => (
            <li key={review.id} className="space-y-1.5 rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-charcoal">{review.userName}</p>
                <StarRating rating={review.rating} />
              </div>
              {review.comment ? <p className="text-sm text-charcoal-muted">{review.comment}</p> : null}
              <p className="text-xs text-charcoal-muted">
                {new Date(review.createdAt).toLocaleDateString("fa-IR")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
