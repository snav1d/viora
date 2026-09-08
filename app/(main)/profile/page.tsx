import type { Metadata } from "next";
import { User as UserIcon, Package } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getOrdersForUser } from "@/lib/data/orders";
import { toNumber } from "@/lib/decimal";
import { ORDER_STATUS_LABELS } from "@/lib/labels";

export const metadata: Metadata = {
  title: "پروفایل",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    return (
      <main className="flex flex-1 flex-col">
        <TopBar title="پروفایل" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-400">
            <UserIcon className="h-7 w-7" strokeWidth={1.5} />
          </span>
          <p className="text-sm text-charcoal-muted">
            برای مشاهده‌ی پروفایل و تاریخچه‌ی سفارش‌ها وارد شوید.
          </p>
          <ButtonLink href="/auth?redirect=%2Fprofile" size="md">
            ورود / ثبت‌نام
          </ButtonLink>
        </div>
      </main>
    );
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  const orders = await getOrdersForUser(session.userId);

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-5">
      <TopBar title="پروفایل" />

      <section className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <UserIcon className="h-6 w-6" strokeWidth={1.5} />
        </span>
        <div>
          <p className="font-medium text-charcoal">{user.name ?? "کاربر ویورا"}</p>
          <p dir="ltr" className="text-left text-sm text-charcoal-muted">
            {user.phone}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-charcoal">تاریخچه‌ی سفارش‌ها</h2>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
            <Package className="h-6 w-6 text-charcoal-muted" strokeWidth={1.5} />
            <p className="text-sm text-charcoal-muted">هنوز سفارشی ثبت نکرده‌اید.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 text-sm"
              >
                <div className="space-y-1">
                  <p className="font-medium text-charcoal">
                    سفارش <span dir="ltr">#{order.id.slice(-6).toUpperCase()}</span>
                  </p>
                  <p className="text-charcoal-muted">
                    {order.items.length.toLocaleString("fa-IR")} قلم ·{" "}
                    {toNumber(order.totalAmount).toLocaleString("fa-IR")}{" "}
                    تومان
                  </p>
                </div>
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <LogoutButton />
    </main>
  );
}
