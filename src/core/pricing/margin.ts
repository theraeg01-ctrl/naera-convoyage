import { assertNonNegative, DomainError } from "../shared/errors";
import { roundMoney } from "../shared/money";

/**
 * DÉFINITIONS UNIQUES DE LA MARGE (toute l'application, tous les écrans).
 *
 * - Marge brute (€)             = prix de vente HT − coût interne
 * - Taux de marge sur vente (%) = marge brute / prix de vente HT
 *     → C'EST le taux utilisé pour la marge cible, la marge minimum,
 *       la rentabilité et les indicateurs de pilotage.
 * - Majoration sur coût (%)     = marge brute / coût interne
 *     → indicateur secondaire, toujours nommé « majoration sur coût »,
 *       jamais simplement « marge ».
 *
 * Exemple : prix 259 € HT, coût 198 € → marge brute 61 €,
 * taux de marge sur vente 23,55 %, majoration sur coût 30,81 %.
 * Une marge de 30 % n'est donc PAS une majoration de 30 % :
 * prix = coût / (1 − 30 %) et non coût × 1,30.
 */

/** Politique de marge : taux de marge sur vente (%) ou marge brute fixe (€). */
export type MarginPolicy = { mode: "PERCENT"; percent: number } | { mode: "FIXED"; amount: number };

/** Taux de marge sur vente maximal accepté (au-delà, le prix tend vers l'infini). */
export const MAX_MARGIN_RATE_PERCENT = 95;

function assertMarginRate(ratePercent: number, label: string): void {
  assertNonNegative(ratePercent, label);
  if (ratePercent > MAX_MARGIN_RATE_PERCENT) {
    throw new DomainError(`${label} : ${ratePercent} % dépasse ${MAX_MARGIN_RATE_PERCENT} %`);
  }
}

/** Prix de vente HT donnant exactement un taux de marge sur vente : coût / (1 − taux). */
export function priceForMarginRate(internalCost: number, marginRatePercent: number): number {
  assertNonNegative(internalCost, "Coût interne");
  assertMarginRate(marginRatePercent, "Taux de marge sur vente");
  return roundMoney(internalCost / (1 - marginRatePercent / 100));
}

/** Prix cible exact (avant arrondi commercial) selon la politique de marge. */
export function applyMargin(internalCost: number, policy: MarginPolicy): number {
  assertNonNegative(internalCost, "Coût interne");
  if (policy.mode === "PERCENT") return priceForMarginRate(internalCost, policy.percent);
  assertNonNegative(policy.amount, "Marge brute (€)");
  return roundMoney(internalCost + policy.amount);
}

/**
 * Prix minimum rentable : prix donnant au moins le taux de marge sur vente
 * minimum, arrondi à l'euro supérieur (le taux obtenu n'est jamais inférieur).
 */
export function minimumProfitablePrice(internalCost: number, minimumMarginRatePercent: number): number {
  assertNonNegative(internalCost, "Coût interne");
  assertMarginRate(minimumMarginRatePercent, "Taux de marge minimum");
  return Math.ceil(roundMoney(internalCost / (1 - minimumMarginRatePercent / 100)));
}

export function grossMargin(sellingPriceHT: number, internalCost: number): number {
  return roundMoney(sellingPriceHT - internalCost);
}

/** Taux de marge sur vente, en % (null si le prix est nul). */
export function grossMarginRate(sellingPriceHT: number, internalCost: number): number | null {
  return sellingPriceHT === 0 ? null : ((sellingPriceHT - internalCost) / sellingPriceHT) * 100;
}

/** Majoration sur coût, en % (null si le coût est nul). */
export function markupRate(sellingPriceHT: number, internalCost: number): number | null {
  return internalCost === 0 ? null : ((sellingPriceHT - internalCost) / internalCost) * 100;
}

export interface MarginResult {
  /** Marge brute (€) = prix de vente HT − coût interne. */
  grossMargin: number;
  /** Taux de marge sur vente (%) = marge brute / prix de vente HT. */
  grossMarginRate: number | null;
  /** Majoration sur coût (%) = marge brute / coût interne. Indicateur secondaire. */
  markupRate: number | null;
}

export function computeMargin(sellingPriceHT: number, internalCost: number): MarginResult {
  assertNonNegative(sellingPriceHT, "Prix de vente HT");
  assertNonNegative(internalCost, "Coût interne");
  return {
    grossMargin: grossMargin(sellingPriceHT, internalCost),
    grossMarginRate: grossMarginRate(sellingPriceHT, internalCost),
    markupRate: markupRate(sellingPriceHT, internalCost),
  };
}

/**
 * Relit la marge d'un tarif enregistré avant ces définitions (anciens champs
 * `amount`, `rateOnCost`, `rateOnPrice`) : le prix de vente et le coût
 * historiques ne changent pas, seuls les indicateurs sont recalculés.
 */
export function normalizeStoredMargin(margin: unknown, sellingPriceHT: number, internalCost: number): MarginResult {
  const current = margin as Partial<MarginResult> | null | undefined;
  if (current && typeof current.grossMargin === "number") return current as MarginResult;
  return computeMargin(Math.max(0, sellingPriceHT), Math.max(0, internalCost));
}
