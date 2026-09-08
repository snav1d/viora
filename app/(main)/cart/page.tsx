import type { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = {
  title: "سبد خرید",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <main className="flex flex-1 flex-col">
      <TopBar title="سبد خرید" />
      <CartView />
    </main>
  );
}
