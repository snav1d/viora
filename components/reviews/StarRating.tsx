import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

export function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const starSize = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={cn(starSize, value <= rating ? "text-gold-500" : "text-border")}
          fill={value <= rating ? "currentColor" : "none"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}
