"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart/CartContext";
import { Button } from "@/components/ui/Button";

export function AddToCartButton({
  productId,
  slug,
  title,
  price,
}: {
  productId: string;
  slug: string;
  title: string;
  price: number;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={() => {
        addItem({ productId, slug, title, price });
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
    >
      {added ? "به سبد اضافه شد" : "افزودن به سبد خرید"}
    </Button>
  );
}
