import { assertNonNegative } from "../shared/errors";
import { roundMoney, sumMoney } from "../shared/money";
import type { FeeItem } from "../settings/types";

export function calculateDriverCost(durationMin: number, hourlyRate: number): number {
  assertNonNegative(durationMin, "Durée mission");
  assertNonNegative(hourlyRate, "Coût horaire");
  return roundMoney((durationMin / 60) * hourlyRate);
}

export function calculateFixedFees(fees: readonly FeeItem[]): number {
  fees.forEach((fee) => assertNonNegative(fee.amount, `Frais « ${fee.label} »`));
  return sumMoney(fees.map((fee) => fee.amount));
}

export function calculateVariableFees(distanceKm: number, feePerKm: number): number {
  assertNonNegative(distanceKm, "Distance");
  assertNonNegative(feePerKm, "Frais kilométriques");
  return roundMoney(distanceKm * feePerKm);
}

export interface MissionCostInput {
  driver: number;
  access: number;
  fuel: number;
  tolls: number;
  return: number;
  fixedFees: number;
  variableFees: number;
  options: number;
  other: number;
}

export interface MissionCostBreakdown extends MissionCostInput {
  total: number;
}

/**
 * Coût interne = temps convoyeur + transport aller + carburant + péages
 * + transport retour + frais fixes + frais variables + options + autres coûts.
 */
export function calculateMissionCost(input: MissionCostInput): MissionCostBreakdown {
  const entries = Object.entries(input) as Array<[keyof MissionCostInput, number]>;
  const rounded = {} as MissionCostInput;
  for (const [key, value] of entries) {
    assertNonNegative(value, `Coût (${key})`);
    rounded[key] = roundMoney(value);
  }
  return { ...rounded, total: sumMoney(Object.values(rounded)) };
}
