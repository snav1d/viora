/**
 * Payment abstraction (docs/decisions.md ADR 3). Sprint 0 ships a mock provider that always
 * succeeds. The real implementation later is an Iranian PSP with a split-payment (تسهیم وجوه)
 * service — see project-plan-v1.md §2 and §7 — swapped in here without touching call sites.
 */
export interface PaymentProvider {
  /** Charges the customer for an order. Sprint 0's mock never actually charges anything. */
  charge(params: { orderId: string; amount: number }): Promise<{ success: true; reference: string }>;
}

class MockPaymentProvider implements PaymentProvider {
  async charge({ orderId }: { orderId: string; amount: number }) {
    return { success: true as const, reference: `mock_${orderId}_${Date.now()}` };
  }
}

let cached: PaymentProvider | undefined;

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;

  switch (process.env.PAYMENT_PROVIDER ?? "mock") {
    case "mock":
      cached = new MockPaymentProvider();
      break;
    default:
      throw new Error(
        `Unknown PAYMENT_PROVIDER "${process.env.PAYMENT_PROVIDER}". Only "mock" is implemented in Sprint 0.`,
      );
  }
  return cached;
}
