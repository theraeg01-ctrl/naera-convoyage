import { assertNonNegative } from "../shared/errors";
import { roundMoney } from "../shared/money";
import type { AppSettings, FuelType } from "../settings/types";

export type EnergyUnit = "L" | "kWh";

export interface FuelComputation {
  fuelType: FuelType;
  consumptionPer100: number;
  quantity: number;
  unit: EnergyUnit;
  unitPrice: number;
  cost: number;
}

/** distance × consommation / 100 × prix unitaire. */
export function calculateFuelCost(distanceKm: number, consumptionPer100: number, unitPrice: number): number {
  assertNonNegative(distanceKm, "Distance");
  assertNonNegative(consumptionPer100, "Consommation");
  assertNonNegative(unitPrice, "Prix carburant");
  return roundMoney((distanceKm * consumptionPer100 * unitPrice) / 100);
}

export function energyUnit(fuelType: FuelType): EnergyUnit {
  return fuelType === "ELECTRIC" ? "kWh" : "L";
}

/** Prix unitaire selon l'énergie : l'hybride consomme de l'essence. */
export function energyPrice(fuelType: FuelType, fuel: AppSettings["fuel"]): number {
  switch (fuelType) {
    case "DIESEL":
      return fuel.dieselPrice;
    case "ELECTRIC":
      return fuel.electricityPrice;
    case "PETROL":
    case "HYBRID":
      return fuel.petrolPrice;
  }
}

export function computeFuel(
  distanceKm: number,
  fuelType: FuelType,
  fuel: AppSettings["fuel"],
  consumptionOverride?: number,
): FuelComputation {
  const consumptionPer100 = consumptionOverride ?? fuel.consumption[fuelType];
  const unitPrice = energyPrice(fuelType, fuel);
  const cost = calculateFuelCost(distanceKm, consumptionPer100, unitPrice);
  return {
    fuelType,
    consumptionPer100,
    quantity: Math.round(((distanceKm * consumptionPer100) / 100) * 10) / 10,
    unit: energyUnit(fuelType),
    unitPrice,
    cost,
  };
}
