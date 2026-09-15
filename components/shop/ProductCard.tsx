import Link from "next/link";
import { ImageOff } from "lucide-react";

export function ProductPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-gold-100 text-rose-400 ${className ?? ""}`}
    >
      <ImageOff className="h-6 w-6" strokeWidth={1.5} />
    </div>
  );
}

export function ProductCard({
  slug,
  title,
  price,
  discountPrice,
}: {
  slug: string;
  title: string;
  price: number;
  discountPrice?: number | null;
}) {
  return (
    <Link
      href={`/shop/product/${slug}`}
      className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-2.5 transition-shadow hover:shadow-md"
    >
      <ProductPlaceholder className="aspect-square w-full" />
      <div className="space-y-0.5 px-0.5 pb-1">
        <p className="line-clamp-2 text-sm font-medium text-charcoal">{title}</p>
        {discountPrice ? (
          <div className="flex items-baseline gap-1.5">
            <p className="text-sm font-semibold text-rose-700">
              {discountPrice.toLocaleString("fa-IR")} تومان
            </p>
            <p className="text-xs text-charcoal-muted line-through">
              {price.toLocaleString("fa-IR")}
            </p>
          </div>
        ) : (
          <p className="text-sm font-semibold text-rose-700">
            {price.toLocaleString("fa-IR")} تومان
          </p>
        )}
      </div>
    </Link>
  );
}
