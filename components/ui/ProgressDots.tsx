import { cn } from "@/lib/cn";

export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-2" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current}>
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-2 rounded-full transition-all",
            index === current - 1 ? "w-6 bg-gold-500" : "w-2 bg-rose-100",
          )}
        />
      ))}
    </div>
  );
}
