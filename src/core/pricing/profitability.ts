import { assertNonNegative } from "../shared/errors";

export type ProfitabilityStatus = "PROFITABLE" | "BELOW_TARGET" | "INSUFFICIENT";

export interface ProfitabilityInput {
  packagePrice: number;
  /** Prix cible exact : taux de marge cible sur vente atteint. */
  targetPrice: number;
  /** Prix minimum rentable : taux de marge minimum sur vente atteint. */
  minimumPrice: number;
}

export interface ProfitabilityCheck extends ProfitabilityInput {
  status: ProfitabilityStatus;
  /** true si le prix du package peut être proposé tel quel. */
  packageIsRecommended: boolean;
  message: string;
}

/** Rentabilité du FORFAIT CATALOGUE seul (pas du prix final appliqué : voir checkAppliedPrice). */
export const PROFITABILITY_MESSAGES: Record<ProfitabilityStatus, string> = {
  PROFITABLE: "Forfait rentable au tarif catalogue",
  BELOW_TARGET: "Forfait catalogue sous la marge cible",
  INSUFFICIENT: "Forfait catalogue sous le prix minimum rentable",
};

/**
 * Compare toujours package commercial / coût interne / prix minimum rentable.
 * Le package n'est jamais considéré rentable par défaut. Ce contrôle porte
 * sur le forfait catalogue : si le forfait est ajusté, la rentabilité du prix
 * finalement appliqué se lit avec checkAppliedPrice.
 */
export function checkProfitability(input: ProfitabilityInput): ProfitabilityCheck {
  assertNonNegative(input.packagePrice, "Prix package");
  assertNonNegative(input.targetPrice, "Prix cible");
  assertNonNegative(input.minimumPrice, "Prix minimum");
  let status: ProfitabilityStatus;
  if (input.packagePrice < input.minimumPrice) status = "INSUFFICIENT";
  else if (input.packagePrice < input.targetPrice) status = "BELOW_TARGET";
  else status = "PROFITABLE";
  return {
    ...input,
    status,
    packageIsRecommended: status === "PROFITABLE",
    message: PROFITABILITY_MESSAGES[status],
  };
}

/** Rentabilité du PRIX FINAL appliqué à la prestation (après ajustement éventuel du forfait). */
export type AppliedPriceStatus = "TARGET_REACHED" | "MINIMUM_REACHED" | "BELOW_MINIMUM";

export const APPLIED_PRICE_MESSAGES: Record<AppliedPriceStatus, string> = {
  TARGET_REACHED: "Marge cible atteinte",
  MINIMUM_REACHED: "Marge minimum atteinte, sous la marge cible",
  BELOW_MINIMUM: "Prix sous le minimum rentable",
};

/** Tolérance d'un demi-centime : les prix comparés sont déjà arrondis au centime. */
const HALF_CENT = 0.005;

export function checkAppliedPrice(input: {
  appliedPrice: number;
  targetPrice: number;
  minimumPrice: number;
}): AppliedPriceStatus {
  assertNonNegative(input.appliedPrice, "Prix appliqué");
  if (input.appliedPrice >= input.targetPrice - HALF_CENT) return "TARGET_REACHED";
  if (input.appliedPrice >= input.minimumPrice - HALF_CENT) return "MINIMUM_REACHED";
  return "BELOW_MINIMUM";
}
