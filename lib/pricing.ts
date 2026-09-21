/// Central place for the platform's own hidden margin on top of every seller/partner-entered
/// price (docs/decisions.md ADR 45) - applied at every customer-facing price display (product
/// card, product page, cart, wizard bundle, print pricing, service offerings, order receipts)
/// AND at the moment an order is actually charged, so the two never disagree and the increase
/// never shows up as a separate, visible bump at checkout. The seller/partner's own entered
/// price - what OrderItem.unitPrice/splitAmount store for settlement - is never touched; this
/// function only ever produces a new, larger number for the customer to see/pay.
///
/// Rounded to the nearest whole Toman (not a "cleaner" 100/1000) - exact accuracy of the rate
/// matters more than a round-looking number, especially since it's meant to stay invisible.
///
/// No "server-only" here: called from both server pages/routes and client components (cart,
/// wizard result, other-sellers list) - same reasoning as lib/serviceCategories.ts.

const PLATFORM_MARKUP_RATE = 0.015;

export function applyPlatformMarkup(originalAmount: number): number {
  return Math.round(originalAmount * (1 + PLATFORM_MARKUP_RATE));
}
