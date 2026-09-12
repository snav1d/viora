import "server-only";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import budgetAllocation from "@/config/party-wizard/budget-allocation.json";
import themesConfig from "@/config/party-wizard/themes.json";

export type BundleItem = {
  kind: "product" | "service";
  id: string;
  slug: string;
  title: string;
  categoryId: string;
  categoryLabel: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type SuggestedBundle = {
  items: BundleItem[];
  totalAmount: number;
  budget: number;
  summaryText: string;
};

type EngineInput = {
  cityId: string;
  theme: string;
  budget: number;
  guestCount: number;
  ageGroup: string;
  partyType: string;
};

const AUXILIARY_SERVICES_ID = "auxiliary-services";
const CORE_DECOR_ID = "balloons-decor";
const CORE_TABLEWARE_ID = "disposable-tableware";
const GUEST_GIFTS_ID = "guest-gifts";

// A per-guest item (one gift per attendee) - every other category's seeded products are already
// party-sized units (a 100-balloon pack, a 32-person tableware set, a 1kg cake), not "1 per
// guest", so they default to quantity 1. See docs/decisions.md ADR 22.
function quantityForCategory(categoryId: string, guestCount: number): number {
  return categoryId === GUEST_GIFTS_ID ? guestCount : 1;
}

/** Category budgets in Toman, after applying the JSON config's low-budget overflow rule. */
function categoryBudgets(totalBudget: number): { id: string; label: string; tomans: number }[] {
  const percents = new Map(budgetAllocation.categories.map((c) => [c.id, c.percent]));

  if (totalBudget < budgetAllocation.overflowRule.minBudgetTomans) {
    const auxPercent = percents.get(AUXILIARY_SERVICES_ID) ?? 0;
    const decorPercent = percents.get(CORE_DECOR_ID) ?? 0;
    const tablewarePercent = percents.get(CORE_TABLEWARE_ID) ?? 0;
    const ratioTotal = decorPercent + tablewarePercent;
    percents.delete(AUXILIARY_SERVICES_ID);
    if (ratioTotal > 0) {
      percents.set(CORE_DECOR_ID, decorPercent + (auxPercent * decorPercent) / ratioTotal);
      percents.set(
        CORE_TABLEWARE_ID,
        tablewarePercent + (auxPercent * tablewarePercent) / ratioTotal,
      );
    }
  }

  return budgetAllocation.categories
    .filter((c) => percents.has(c.id))
    .map((c) => ({
      id: c.id,
      label: c.label,
      tomans: Math.round((totalBudget * (percents.get(c.id) ?? 0)) / 100),
    }));
}

function findThemeColors(themeLabel: string): string[] {
  return themesConfig.themes.find((t) => t.label === themeLabel)?.colors ?? [];
}

/** Simple substring match against the theme's keywords / colors - there's no structured "theme"
 * column on Product/ServiceOffering (see docs/decisions.md ADR 22), so title+description text is
 * the only signal available without a schema change. Theme labels in themes.json are often
 * compound ("یونیکورن/رنگین‌کمان") - split on "/" and whitespace so a product titled just
 * "بک‌دراپ تم یونیکورن" still matches, instead of requiring the whole compound string verbatim. */
function themeKeywords(themeLabel: string): string[] {
  return themeLabel.split(/[/\s]+/).filter(Boolean);
}

/** Split into keyword vs. color signal, not one combined number: a color word alone
 * ("طلایی"/gold) is common enough across unrelated products that treating it as equally
 * "themed" as an actual keyword match ("باربی") lets a coincidentally-gold-colored, otherwise
 * generic product outrank - or worse, stand in for - a genuinely theme-matched one. See
 * docs/decisions.md ADR 24 for the live example this was caught from (a "طلایی کلاسیک" gift
 * outranking real Barbie-themed gifts purely because Barbie's color list includes "طلایی"). */
function themeMatchScore(text: string, theme: string, colors: string[]): { keywordScore: number; colorScore: number } {
  let keywordScore = 0;
  for (const keyword of themeKeywords(theme)) {
    if (text.includes(keyword)) keywordScore += 2;
  }
  let colorScore = 0;
  for (const color of colors) {
    if (color && text.includes(color)) colorScore += 1;
  }
  return { keywordScore, colorScore };
}

async function pickProduct(
  categorySlug: string,
  cityId: string,
  tomansBudget: number,
  quantity: number,
  theme: string,
  colors: string[],
) {
  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!category || !category.isActive) return null;

  const products = await prisma.product.findMany({
    where: { cityId, categoryId: category.id, isActive: true, stock: { gt: 0 } },
  });
  if (products.length === 0) return null;

  const scored = products.map((product) => {
    const unitPrice = toNumber(product.price);
    const { keywordScore, colorScore } = themeMatchScore(
      `${product.title} ${product.description ?? ""}`,
      theme,
      colors,
    );
    return {
      product,
      unitPrice,
      lineTotal: unitPrice * quantity,
      score: keywordScore + colorScore,
      isThemed: keywordScore > 0,
    };
  });

  // Theme match takes priority over strict budget-fit, not the other way around - see
  // docs/decisions.md ADR 24. Filtering to "within this category's budget slice" *before* ranking
  // by theme would silently throw away every theme-matched candidate whenever all of them happen
  // to price above that slice (routine for a per-guest-scaled category like guest-gifts, where a
  // themed item costing a bit more than a generic one gets multiplied by guestCount) - the result
  // looks like "no themed product exists" even when one clearly does. Restrict to theme-matched
  // candidates first when any exist (gated on an actual keyword match, not a color coincidence -
  // see themeMatchScore); only fall through to the full set (ranked by price alone) when nothing
  // in the category matches the theme's keywords at all.
  const themed = scored.filter((s) => s.isThemed);
  const pool = themed.length > 0 ? themed : scored;

  const withinBudget = pool.filter((s) => s.lineTotal <= tomansBudget);
  const chosen =
    withinBudget.length > 0
      ? withinBudget.sort((a, b) => b.score - a.score || b.lineTotal - a.lineTotal)[0]
      : [...pool].sort((a, b) => b.score - a.score || a.lineTotal - b.lineTotal)[0];

  return chosen;
}

/** Unlike the five core categories (always filled, falling back to the cheapest option so the
 * bundle never comes up short on an essential), auxiliary services are explicitly optional per
 * docs/party-wizard-engine-spec.md §3 ("فقط اگر بودجه اجازه بده") - skipped entirely rather than
 * forced over budget when nothing fits. There's also no single fixed Category slug for this
 * conceptual bucket ("عکاس، دی‌جی و...") - Sprint 0 only ever seeds one SERVICE-type category
 * (promotional balloon printing), so this looks at whatever active SERVICE categories exist in
 * the city rather than one hardcoded id. */
async function pickAuxiliaryService(cityId: string, tomansBudget: number, theme: string, colors: string[]) {
  const offerings = await prisma.serviceOffering.findMany({
    where: { cityId, isActive: true, category: { type: "SERVICE", isActive: true } },
  });
  if (offerings.length === 0) return null;

  const scored = offerings.map((offering) => {
    const unitPrice = toNumber(offering.basePrice);
    const { keywordScore, colorScore } = themeMatchScore(
      `${offering.title} ${offering.description ?? ""}`,
      theme,
      colors,
    );
    return { offering, unitPrice, score: keywordScore + colorScore };
  });

  const withinBudget = scored.filter((s) => s.unitPrice <= tomansBudget);
  if (withinBudget.length === 0) return null;

  return withinBudget.sort((a, b) => b.score - a.score || b.unitPrice - a.unitPrice)[0];
}

const FALLBACK_SUMMARY_TEMPLATE = [
  "برای جشن {party_type} با تم {theme}، مناسب سن {age_group} و {guest_count} مهمان،",
  "این ترکیب رو با بودجه‌ی {budget} تومان براتون آماده کردیم.",
  "بیشترین سهم بودجه برای {top_category} در نظر گرفته شده چون معمولاً",
  "بیشترین تاثیر رو روی حس‌وحال جشن می‌ذاره.",
].join("\n");

function renderSummary(vars: {
  partyType: string;
  theme: string;
  ageGroup: string;
  guestCount: number;
  budget: number;
  topCategoryLabel: string;
}): string {
  let template: string;
  try {
    template = fs.readFileSync(
      path.join(process.cwd(), "config/party-wizard/result-template.txt"),
      "utf-8",
    );
  } catch {
    template = FALLBACK_SUMMARY_TEMPLATE;
  }

  return template
    .replaceAll("{party_type}", vars.partyType)
    .replaceAll("{theme}", vars.theme)
    .replaceAll("{age_group}", vars.ageGroup)
    .replaceAll("{guest_count}", vars.guestCount.toLocaleString("fa-IR"))
    .replaceAll("{budget}", vars.budget.toLocaleString("fa-IR"))
    .replaceAll("{top_category}", vars.topCategoryLabel);
}

/** Phase 1 (rule-based, no AI) of docs/party-wizard-engine-spec.md's suggestion engine - see
 * docs/decisions.md ADR 22. Reads the budget-allocation table, filters active products/services
 * in the requested city, and picks one item per category. */
export async function suggestBundle(input: EngineInput): Promise<SuggestedBundle> {
  const colors = findThemeColors(input.theme);
  const budgets = categoryBudgets(input.budget);
  const items: BundleItem[] = [];

  for (const category of budgets) {
    if (category.id === AUXILIARY_SERVICES_ID) {
      const picked = await pickAuxiliaryService(input.cityId, category.tomans, input.theme, colors);
      if (picked) {
        items.push({
          kind: "service",
          id: picked.offering.id,
          slug: picked.offering.slug,
          title: picked.offering.title,
          categoryId: category.id,
          categoryLabel: category.label,
          unitPrice: picked.unitPrice,
          quantity: 1,
          lineTotal: picked.unitPrice,
        });
      }
      continue;
    }

    const quantity = quantityForCategory(category.id, input.guestCount);
    const picked = await pickProduct(
      category.id,
      input.cityId,
      category.tomans,
      quantity,
      input.theme,
      colors,
    );
    if (picked) {
      items.push({
        kind: "product",
        id: picked.product.id,
        slug: picked.product.slug,
        title: picked.product.title,
        categoryId: category.id,
        categoryLabel: category.label,
        unitPrice: picked.unitPrice,
        quantity,
        lineTotal: picked.lineTotal,
      });
    }
  }

  const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const topCategory = items.reduce<BundleItem | null>(
    (best, item) => (!best || item.lineTotal > best.lineTotal ? item : best),
    null,
  );

  const summaryText = renderSummary({
    partyType: input.partyType,
    theme: input.theme,
    ageGroup: input.ageGroup,
    guestCount: input.guestCount,
    budget: input.budget,
    topCategoryLabel: topCategory?.categoryLabel ?? "",
  });

  return { items, totalAmount, budget: input.budget, summaryText };
}
