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

export const AGE_BUCKETS = ["زیر ۱ سال", "۱ تا ۳ سال", "۴ تا ۷ سال", "۸ تا ۱۲ سال", "۱۳ سال به بالا"];

export const GUEST_COUNT_PRESETS = [10, 20, 30, 50, 80];

export const BUDGET_PRESETS = [2_000_000, 3_000_000, 5_000_000, 8_000_000, 12_000_000];
