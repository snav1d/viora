/**
 * Shared between the registration wizard (client) and its API route (server) so both sides
 * agree on the exact same set of valid "how did you hear about us" answers. See
 * docs/decisions.md ADR 29.
 */
export const REFERRAL_SOURCES = [
  { value: "colleagues", label: "همکاران" },
  { value: "internet_social", label: "اینترنت / شبکه‌های اجتماعی" },
  { value: "other", label: "از راه دیگر" },
] as const;

export type ReferralSource = (typeof REFERRAL_SOURCES)[number]["value"];
