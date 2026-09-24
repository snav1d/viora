import Link from "next/link";
import { ChevronRight } from "lucide-react";

/// docs/design-system.md §7-الف: the back-button pattern for any page whose first element is a
/// full-bleed hero image - a circle floating on the image itself, replacing a separate TopBar
/// strip that would otherwise sit above the image and become the actual first thing seen.
export function FloatingBackButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="بازگشت"
      className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-charcoal/50 text-warm-white backdrop-blur-sm hover:bg-charcoal/70"
    >
      <ChevronRight className="h-5 w-5" />
    </Link>
  );
}
