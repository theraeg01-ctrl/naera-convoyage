import { assertNonNegative } from "../shared/errors";
import { sumMoney } from "../shared/money";
import type { AppSettings, FuelType, PackageTier, SelectableOptionId } from "../settings/types";
import {
  calculateDriverCost,
  calculateFixedFees,
  calculateMissionCost,
  calculateVariableFees,
  type MissionCostBreakdown,
} from "./cost";
import { calculateMissionDuration, type MissionDurationBreakdown } from "./duration";
import { computeFuel, type FuelComputation } from "./fuel-calculator";
import { applyMargin, computeMargin, minimumProfitablePrice, type MarginPolicy, type MarginResult } from "./margin";
import { computeOptionLines, computeOptionsInternalCost, type PriceLine } from "./options";
import { resolvePackage } from "./packages";
import { checkProfitability, type ProfitabilityCheck } from "./profitability";
import { commercialRounding } from "./rounding";
import { computeVat, type VatBreakdown } from "./vat";

export interface PricingLeg {
  cost: number;
  durationMin: number;
}

export interface MissionPricingInput {
  route: {
    distanceKm: number;
    /** Durée retenue pour la conduite (avec trafic si disponible). */
    drivingMin: number;
    tollsEur: number;
  };
  vehicle: {
    fuelType: FuelType;
    consumptionPer100?: number;
  };
  access: PricingLeg;
  return: PricingLeg;
  date: string;
  waitingMin: number;
  optionIds: readonly SelectableOptionId[];
  /** Marge personnalisée pour cette mission (sinon : paramètres). */
  marginOverride?: MarginPolicy;
  otherCosts?: number;
}

export interface MissionPricing {
  duration: MissionDurationBreakdown;
  fuel: FuelComputation;
  costs: MissionCostBreakdown;
  marginPolicy: MarginPolicy;
  package: { id: PackageTier["id"]; name: string; price: number };
  /** Prix cible exact (coût + marge), avant arrondi. */
  targetPrice: number;
  minimumPrice: number;
  /** Prix de la prestation de convoyage retenu (package ou prix cible arrondi). */
  basePrice: number;
  lines: PriceLine[];
  totals: VatBreakdown;
  margin: MarginResult;
  profitability: ProfitabilityCheck;
}

export function marginPolicyFromSettings(pricing: AppSettings["pricing"]): MarginPolicy {
  return pricing.marginMode === "PERCENT"
    ? { mode: "PERCENT", percent: pricing.marginPercent }
    : { mode: "FIXED", amount: pricing.marginFixedAmount };
}

function validateInput(input: MissionPricingInput): void {
  assertNonNegative(input.route.distanceKm, "Distance");
  assertNonNegative(input.route.drivingMin, "Durée de conduite");
  assertNonNegative(input.route.tollsEur, "Péages");
  assertNonNegative(input.access.cost, "Coût aller convoyeur");
  assertNonNegative(input.access.durationMin, "Durée aller convoyeur");
  assertNonNegative(input.return.cost, "Coût retour convoyeur");
  assertNonNegative(input.return.durationMin, "Durée retour convoyeur");
  assertNonNegative(input.waitingMin, "Attente prévue");
  assertNonNegative(input.otherCosts ?? 0, "Autres coûts");
}

/**
 * Calcul complet d'une mission : durée, coût réel, package, prix minimum,
 * prix conseillé, options, TVA, marge et contrôle de rentabilité.
 */
export function computeMissionPricing(input: MissionPricingInput, settings: AppSettings): MissionPricing {
  validateInput(input);
  const { pricing } = settings;

  const duration = calculateMissionDuration(
    {
      accessMin: input.access.durationMin,
      drivingMin: input.route.drivingMin,
      returnMin: input.return.durationMin,
      waitingMin: input.waitingMin,
    },
    settings.times,
  );
  const fuel = computeFuel(
    input.route.distanceKm,
    input.vehicle.fuelType,
    settings.fuel,
    input.vehicle.consumptionPer100,
  );

  const costs = calculateMissionCost({
    driver: calculateDriverCost(duration.totalMin, pricing.hourlyDriverCost),
    access: input.access.cost,
    fuel: fuel.cost,
    tolls: input.route.tollsEur,
    return: input.return.cost,
    fixedFees: calculateFixedFees(pricing.fixedFees),
    variableFees: calculateVariableFees(input.route.distanceKm, pricing.variableFeePerKm),
    options: computeOptionsInternalCost(input, settings.options),
    other: input.otherCosts ?? 0,
  });

  const marginPolicy = input.marginOverride ?? marginPolicyFromSettings(pricing);
  const targetPrice = applyMargin(costs.total, marginPolicy);
  const minimumPrice = minimumProfitablePrice(costs.total, pricing.minimumMarginPercent);
  const pkg = resolvePackage(input.route.distanceKm, settings.packages, pricing.roundingMode);
  const profitability = checkProfitability({ packagePrice: pkg.price, targetPrice, minimumPrice });

  const basePrice = profitability.packageIsRecommended
    ? pkg.price
    : commercialRounding(Math.max(targetPrice, minimumPrice), pricing.roundingMode);

  const serviceLine: PriceLine = {
    id: "SERVICE",
    label: profitability.packageIsRecommended ? `Convoyage — forfait ${pkg.tier.name}` : "Convoyage — tarif sur mesure",
    detail: `${Math.round(input.route.distanceKm)} km`,
    amount: basePrice,
    kind: "SERVICE",
  };
  const lines = [
    serviceLine,
    ...computeOptionLines(
      basePrice,
      { optionIds: input.optionIds, waitingMin: input.waitingMin, date: input.date },
      settings.options,
    ),
  ];
  const totals = computeVat(sumMoney(lines.map((line) => line.amount)), pricing.vatPercent);

  return {
    duration,
    fuel,
    costs,
    marginPolicy,
    package: { id: pkg.tier.id, name: pkg.tier.name, price: pkg.price },
    targetPrice,
    minimumPrice,
    basePrice,
    lines,
    totals,
    margin: computeMargin(totals.ht, costs.total),
    profitability,
  };
}
