export type WizardAnswers = {
  ageGroup: string | null;
  guestCount: number | null;
  budget: number | null;
  cityId: string | null;
  cityName: string | null;
  theme: string | null;
};

export const EMPTY_ANSWERS: WizardAnswers = {
  ageGroup: null,
  guestCount: null,
  budget: null,
  cityId: null,
  cityName: null,
  theme: null,
};

// "۱۳ سال به بالا" (a single 13+ catch-all) was replaced with a proper teen bracket plus three
// adult brackets - keeping the old catch-all alongside "۱۸ تا ۳۰ سال" etc. would have overlapped
// with them instead of extending coverage. See docs/decisions.md ADR 26.
export const AGE_BUCKETS = [
  "زیر ۱ سال",
  "۱ تا ۳ سال",
  "۴ تا ۷ سال",
  "۸ تا ۱۲ سال",
  "۱۳ تا ۱۷ سال",
  "۱۸ تا ۳۰ سال",
  "۳۰ تا ۵۰ سال",
  "بالای ۵۰ سال",
];

export const GUEST_COUNT_PRESETS = [10, 20, 30, 50, 80];

export const BUDGET_PRESETS = [2_000_000, 3_000_000, 5_000_000, 8_000_000, 12_000_000];
