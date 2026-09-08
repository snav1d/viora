import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { getPaymentProvider } from "@/lib/providers/payment";

const bodySchema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1) })).min(1),
  shippingAddress: z.string().min(5),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "ابتدا وارد شوید.", requiresAuth: true }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }

  const productIds = parsed.data.items.map((item) => item.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  if (products.length !== productIds.length) {
    return NextResponse.json({ error: "برخی محصولات دیگر موجود نیستند." }, { status: 400 });
  }

  // Prices/sellers are re-read from the DB, never trusted from the client.
  const lines = parsed.data.items.map((item) => {
    const product = products.find((p) => p.id === item.productId)!;
    const unitPrice = product.price.toNumber();
    return {
      productId: product.id,
      sellerId: product.sellerId,
      quantity: item.quantity,
      unitPrice,
      splitAmount: unitPrice * item.quantity,
    };
  });

  const totalAmount = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  const order = await prisma.order.create({
    data: {
      userId: session.userId,
      orderType: "SINGLE_SELLER",
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      totalAmount,
      shippingAddress: parsed.data.shippingAddress,
      items: {
        create: lines.map((line) => ({
          productId: line.productId,
          sellerId: line.sellerId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          splitAmount: line.splitAmount,
        })),
      },
    },
  });

  const charge = await getPaymentProvider().charge({ orderId: order.id, amount: totalAmount });

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: charge.success
      ? { paymentStatus: "PAID", status: "PROCESSING" }
      : { paymentStatus: "FAILED" },
  });

  return NextResponse.json({ ok: true, orderId: updated.id });
}
