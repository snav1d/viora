import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function TopBar({
  title,
  backHref,
}: {
  title: string;
  backHref?: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-warm-white/95 px-4 py-3 backdrop-blur">
      {backHref ? (
        <Link
          href={backHref}
          aria-label="بازگشت"
          className="flex h-9 w-9 items-center justify-center rounded-full text-charcoal-muted hover:bg-rose-50"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      ) : null}
      <h1 className="text-base font-semibold text-charcoal">{title}</h1>
    </header>
  );
}
