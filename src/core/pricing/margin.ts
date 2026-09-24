import { assertNonNegative } from "../shared/errors";
import { roundMoney } from "../shared/money";

export type MarginPolicy = { mode: "PERCENT"; percent: number } | { mode: "FIXED"; amount: number };

/**
 * Prix cible exact (avant arrondi commercial).
 * Le pourcentage s'applique au coût de revient : c'est le « taux de marge »
 * au sens comptable (marge / coût), et non le taux de marque.
 */
export function applyMargin(cost: number, policy: MarginPolicy): number {
  assertNonNegative(cost, "Coût");
  if (policy.mode === "PERCENT") {
    assertNonNegative(policy.percent, "Marge (%)");
    return roundMoney(cost * (1 + policy.percent / 100));
  }
  assertNonNegative(policy.amount, "Marge (€)");
  return roundMoney(cost + policy.amount);
}

/** Prix minimum rentable : coût + marge minimum, arrondi à l'euro supérieur. */
export function minimumProfitablePrice(cost: number, minimumMarginPercent: number): number {
  assertNonNegative(cost, "Coût");
  assertNonNegative(minimumMarginPercent, "Marge minimum (%)");
  return Math.ceil(roundMoney(cost * (1 + minimumMarginPercent / 100)));
}

export interface MarginResult {
  amount: number;
  /** Taux de marge : marge / coût (null si le coût est nul). */
  rateOnCost: number | null;
  /** Taux de marque : marge / prix de vente HT (null si le prix est nul). */
  rateOnPrice: number | null;
}

export function computeMargin(priceHT: number, cost: number): MarginResult {
  assertNonNegative(priceHT, "Prix HT");
  assertNonNegative(cost, "Coût");
  const amount = roundMoney(priceHT - cost);
  return {
    amount,
    rateOnCost: cost === 0 ? null : (amount / cost) * 100,
    rateOnPrice: priceHT === 0 ? null : (amount / priceHT) * 100,
  };
}
