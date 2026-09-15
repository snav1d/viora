import type { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { CouponForm } from "@/components/admin/CouponForm";

export const metadata: Metadata = {
  title: "کد تخفیف جدید",
  robots: { index: false, follow: false },
};

export default function NewCouponPage() {
  return (
    <main className="flex flex-1 flex-col">
      <TopBar title="کد تخفیف جدید" backHref="/admin/coupons" />
      <CouponForm />
    </main>
  );
}
