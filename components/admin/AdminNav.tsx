"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, UserCheck, Printer, Headset } from "lucide-react";
import { cn } from "@/lib/cn";

// docs/design-system.md §7: below `lg` there's no room for the sidebar's full grouping, so this
// stays a flat tab bar - just trimmed from 6 items to the 4 most-reached-for destinations
// (تخفیف‌ها/شهر و دسته stay one tap away via the dashboard's own grouped sections instead). Hidden
// entirely at `lg`+, where AdminShell's sidebar replaces it.
const TABS = [
  { href: "/admin", label: "داشبورد", icon: LayoutGrid },
  { href: "/admin/sellers", label: "فروشنده‌ها", icon: UserCheck },
  { href: "/admin/providers", label: "پارتنرها", icon: Printer },
  { href: "/admin/tickets", label: "پشتیبانی", icon: Headset },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-colors",
                active ? "text-rose-600" : "text-charcoal-muted",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.5} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
