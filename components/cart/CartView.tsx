"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart/CartContext";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ProductPlaceholder } from "@/components/shop/ProductCard";

export function CartView() {
  const { items, updateQuantity, removeItem, clear, totalPrice } = useCart();
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"online">("online");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleCheckout() {
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          shippingAddress: address,
          paymentMethod,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.requiresAuth) {
          router.push(`/auth?redirect=${encodeURIComponent("/cart")}`);
          return;
        }
        setError(data.error ?? "خطایی رخ داد.");
        return;
      }

      clear();
      router.push("/profile");
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-400">
          <ShoppingBag className="h-7 w-7" strokeWidth={1.5} />
        </span>
        <p className="text-sm text-charcoal-muted">سبد خرید شما خالی است.</p>
        <ButtonLink href="/shop" size="md">
          رفتن به فروشگاه
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 py-5">
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li
            key={item.productId}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
          >
            <ProductPlaceholder className="h-16 w-16 shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="line-clamp-1 text-sm font-medium text-charcoal">{item.title}</p>
              <p className="text-sm font-semibold text-rose-700">
                {item.price.toLocaleString("fa-IR")} تومان
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-600"
                  aria-label="کاهش تعداد"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-5 text-center text-sm">
                  {item.quantity.toLocaleString("fa-IR")}
                </span>
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-600"
                  aria-label="افزایش تعداد"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <button
              onClick={() => removeItem(item.productId)}
              className="text-charcoal-muted hover:text-rose-600"
              aria-label="حذف از سبد"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <label htmlFor="address" className="text-sm font-medium text-charcoal">
          آدرس ارسال
        </label>
        <textarea
          id="address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          rows={3}
          placeholder="تهران، ..."
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-muted/50 focus:border-rose-400 focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-charcoal">روش پرداخت</p>
        <label className="flex items-center gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-3">
          <input
            type="radio"
            name="payment-method"
            checked={paymentMethod === "online"}
            onChange={() => setPaymentMethod("online")}
            className="h-4 w-4 accent-rose-600"
          />
          <span className="text-sm text-charcoal">پرداخت آنلاین (mock)</span>
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-border p-3 opacity-50">
          <input type="radio" name="payment-method" disabled className="h-4 w-4" />
          <span className="text-sm text-charcoal-muted">کیف پول ویورا — به‌زودی</span>
        </label>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
        <span className="text-charcoal-muted">جمع کل</span>
        <span className="text-lg font-bold text-charcoal">
          {totalPrice.toLocaleString("fa-IR")} تومان
        </span>
      </div>

      {error ? <p className="text-center text-sm text-rose-700">{error}</p> : null}

      <Button
        size="lg"
        className="w-full"
        disabled={submitting || address.trim().length < 5}
        onClick={handleCheckout}
      >
        {submitting ? "در حال ثبت سفارش…" : "تکمیل خرید"}
      </Button>
    </div>
  );
}
