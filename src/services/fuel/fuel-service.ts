import { energyPrice, energyUnit } from "@/core/pricing/fuel-calculator";
import type { AppSettings, FuelType } from "@/core/settings/types";

export interface FuelPriceQuote {
  fuelType: FuelType;
  unitPrice: number;
  unit: "L" | "kWh";
  /** Les prix viennent des paramètres (saisie manuelle). */
  source: "MANUAL";
}

/**
 * FuelService : prix des énergies. Aujourd'hui lus dans les paramètres ;
 * prévu pour un flux de prix carburant (ex. données publiques des stations).
 */
export class FuelService {
  constructor(private readonly fuel: AppSettings["fuel"]) {}

  quote(fuelType: FuelType): FuelPriceQuote {
    return { fuelType, unitPrice: energyPrice(fuelType, this.fuel), unit: energyUnit(fuelType), source: "MANUAL" };
  }
}
