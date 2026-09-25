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

export const PROFITABILITY_MESSAGES: Record<ProfitabilityStatus, string> = {
  PROFITABLE: "Package rentable pour cette mission",
  BELOW_TARGET: "Package sous la marge cible",
  INSUFFICIENT: "Tarif package insuffisant pour cette mission",
};

/**
 * Compare toujours package commercial / coût interne / prix minimum rentable.
 * Le package n'est jamais considéré rentable par défaut.
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
