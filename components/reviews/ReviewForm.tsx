"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function ReviewForm({ orderItemId }: { orderItemId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderItemId, rating, comment: comment.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  const displayedRating = hoverRating || rating;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm font-medium text-charcoal">این مورد رو چطور ارزیابی می‌کنید؟</p>
      <div className="flex justify-center gap-1" dir="ltr">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            onMouseEnter={() => setHoverRating(value)}
            onMouseLeave={() => setHoverRating(0)}
            aria-label={`${value} ستاره`}
            className="p-0.5"
          >
            <Star
              className={cn("h-7 w-7", value <= displayedRating ? "text-gold-500" : "text-border")}
              fill={value <= displayedRating ? "currentColor" : "none"}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="نظر شما (اختیاری)"
        rows={3}
        className="w-full rounded-2xl border border-border bg-warm-white px-4 py-3 text-sm text-charcoal focus:border-rose-400 focus:outline-none"
      />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <Button size="md" className="w-full" disabled={rating === 0 || submitting} onClick={handleSubmit}>
        {submitting ? "در حال ثبت…" : "ثبت نظر"}
      </Button>
    </div>
  );
}
