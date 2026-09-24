"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  UserCheck,
  Printer,
  PackageSearch,
  MessageSquareWarning,
  Ticket,
  Image as ImageIcon,
  Palette,
  Boxes,
  Settings2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: number };
type NavGroup = { title: string; items: NavItem[] };

/// The `lg`+ sidebar from docs/design-system.md §7 - replaces the mobile dashboard's flat stack of
/// 10 buttons with a persistent, always-visible, grouped nav so navigating the admin panel on a
/// real screen no longer means a full page round-trip back to /admin just to get to the next
/// section. Support tickets are deliberately not a sidebar destination here - at this breakpoint
/// that role is covered by the floating SupportChatDrawer instead, which is why "پشتیبانی" only
/// appears on the mobile AdminNav (no sidebar equivalent needed).
export function AdminShell({
  counts,
}: {
  counts: {
    pendingSellers: number;
    pendingProviders: number;
    pendingProducts: number;
    pendingReviews: number;
  };
}) {
  const pathname = usePathname();

  const groups: NavGroup[] = [
    {
      title: "نمای‌کلی",
      items: [{ href: "/admin", label: "داشبورد", icon: LayoutGrid }],
    },
    {
      title: "تاییدها",
      items: [
        { href: "/admin/sellers", label: "فروشنده‌ها", icon: UserCheck, badge: counts.pendingSellers },
        { href: "/admin/providers", label: "پارتنرها", icon: Printer, badge: counts.pendingProviders },
        { href: "/admin/products", label: "محصولات", icon: PackageSearch, badge: counts.pendingProducts },
        { href: "/admin/reviews", label: "نظرات", icon: MessageSquareWarning, badge: counts.pendingReviews },
      ],
    },
    {
      title: "تجاری",
      items: [
        { href: "/admin/coupons", label: "کدهای تخفیف", icon: Ticket },
        { href: "/admin/banners", label: "بنر", icon: ImageIcon },
        { href: "/admin/themes", label: "تم فصلی", icon: Palette },
      ],
    },
    {
      title: "عملیات",
      items: [
        { href: "/admin/hub", label: "مرکز پردازش", icon: Boxes },
        { href: "/admin/catalog", label: "شهر و دسته‌بندی", icon: Settings2 },
      ],
    },
  ];

  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-6 overflow-y-auto border-l border-border bg-surface px-4 py-6 lg:flex">
      <p className="px-2 text-base font-bold text-charcoal">پنل ادمین</p>
      <nav className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.title} className="flex flex-col gap-1">
            <p className="px-2 text-xs font-medium text-charcoal-muted">{group.title}</p>
            {group.items.map((item) => {
              const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors",
                    active ? "bg-charcoal text-warm-white" : "text-charcoal hover:bg-rose-50",
                  )}
                >
                  <item.icon className="h-4 w-4" strokeWidth={active ? 2.25 : 1.5} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[11px] font-medium",
                        active ? "bg-warm-white/20 text-warm-white" : "bg-rose-100 text-rose-700",
                      )}
                    >
                      {item.badge.toLocaleString("fa-IR")}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
