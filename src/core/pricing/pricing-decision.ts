import type { MissionPricing } from "./mission-pricing";
import {
  APPLIED_PRICE_MESSAGES,
  checkAppliedPrice,
  type AppliedPriceStatus,
  type ProfitabilityStatus,
} from "./profitability";

/**
 * Lecture de la décision tarifaire en deux temps, pour ne jamais confondre :
 *  1. la rentabilité du FORFAIT CATALOGUE (le tarif affiché dans le catalogue) ;
 *  2. la rentabilité du PRIX FINAL appliqué à la mission.
 * Un forfait sous la marge cible est ajusté : la mission, elle, peut
 * atteindre la marge cible avec le prix appliqué.
 */
export interface PricingDecision {
  package: {
    name: string;
    /** Tarif catalogue HT. */
    price: number;
    status: ProfitabilityStatus;
    /** Forfait remplacé par un prix ajusté (sous la marge cible ou le minimum). */
    adjusted: boolean;
    title: string;
    detail: string;
  };
  applied: {
    /** Prix HT de la prestation de convoyage (options facturées en plus). */
    price: number;
    status: AppliedPriceStatus;
    message: string;
    /** true si des options s'ajoutent à ce prix sur le devis. */
    excludesOptions: boolean;
  };
}

const PACKAGE_DETAILS: Record<ProfitabilityStatus, string> = {
  PROFITABLE: "Le tarif catalogue atteint la marge cible.",
  BELOW_TARGET: "Ce forfait seul est inférieur à la marge cible.",
  INSUFFICIENT: "Ce forfait seul est inférieur au prix minimum rentable.",
};

export function describePricingDecision(
  pricing: Pick<MissionPricing, "package" | "profitability" | "basePrice" | "targetPrice" | "minimumPrice" | "lines">,
): PricingDecision {
  const status = pricing.profitability.status;
  const adjusted = status !== "PROFITABLE";
  const appliedStatus = checkAppliedPrice({
    appliedPrice: pricing.basePrice,
    targetPrice: pricing.targetPrice,
    minimumPrice: pricing.minimumPrice,
  });
  return {
    package: {
      name: pricing.package.name,
      price: pricing.package.price,
      status,
      adjusted,
      title: `Forfait ${pricing.package.name} ${adjusted ? "ajusté" : "rentable"}`,
      detail: PACKAGE_DETAILS[status],
    },
    applied: {
      price: pricing.basePrice,
      status: appliedStatus,
      message: APPLIED_PRICE_MESSAGES[appliedStatus],
      excludesOptions: pricing.lines.some((line) => line.kind !== "SERVICE"),
    },
  };
}
