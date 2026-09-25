import { assertNonNegative, DomainError } from "../shared/errors";
import { roundMoney } from "../shared/money";
import type { PackageTier, RoundingMode } from "../settings/types";
import { commercialRounding } from "./rounding";

/** Package correspondant à la distance (arrondie au kilomètre). */
export function findPackage(distanceKm: number, tiers: readonly PackageTier[]): PackageTier {
  assertNonNegative(distanceKm, "Distance");
  const km = Math.round(distanceKm);
  const tier = tiers.find((candidate) => candidate.maxKm === null || km <= candidate.maxKm);
  if (!tier) throw new DomainError(`Aucun package ne couvre ${km} km`);
  return tier;
}

export interface ResolvedPackage {
  tier: PackageTier;
  price: number;
}

/** Prix du package : forfait + part kilométrique éventuelle (Long Distance). */
export function resolvePackage(
  distanceKm: number,
  tiers: readonly PackageTier[],
  roundingMode: RoundingMode,
): ResolvedPackage {
  const tier = findPackage(distanceKm, tiers);
  if (tier.pricePerKm === 0) return { tier, price: roundMoney(tier.basePrice) };
  const raw = tier.basePrice + tier.pricePerKm * Math.round(distanceKm);
  return { tier, price: commercialRounding(raw, roundingMode) };
}

export function describePackageRange(tier: PackageTier): string {
  if (tier.maxKm === null) return `plus de ${tier.minKm - 1} km`;
  return `${tier.minKm}–${tier.maxKm} km`;
}
