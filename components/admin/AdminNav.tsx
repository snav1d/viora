"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, UserCheck, Printer, Settings2, Headset } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/admin", label: "داشبورد", icon: LayoutGrid },
  { href: "/admin/sellers", label: "فروشنده‌ها", icon: UserCheck },
  { href: "/admin/providers", label: "پارتنرها", icon: Printer },
  { href: "/admin/tickets", label: "پشتیبانی", icon: Headset },
  { href: "/admin/catalog", label: "شهر و دسته", icon: Settings2 },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur">
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
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
