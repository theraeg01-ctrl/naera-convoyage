export const FUEL_TYPES = ["PETROL", "DIESEL", "HYBRID", "ELECTRIC"] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const VEHICLE_CATEGORIES = ["CITY", "SEDAN", "SUV", "VAN", "PREMIUM"] as const;
export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];

export const MARGIN_MODES = ["PERCENT", "FIXED"] as const;
export type MarginMode = (typeof MARGIN_MODES)[number];

export const ROUNDING_MODES = ["EXACT", "UP_5", "UP_10", "PSYCHOLOGICAL"] as const;
export type RoundingMode = (typeof ROUNDING_MODES)[number];

export const OPTIMIZATION_STRATEGIES = ["CHEAPEST", "FASTEST", "BALANCED"] as const;
export type OptimizationStrategy = (typeof OPTIMIZATION_STRATEGIES)[number];

export const PACKAGE_IDS = ["CITY", "LOCAL_PLUS", "REGIONAL", "FRANCE", "FRANCE_PLUS", "LONG_DISTANCE"] as const;
export type PackageId = (typeof PACKAGE_IDS)[number];

export const SERVICE_OPTION_IDS = [
  "PHOTO_INSPECTION",
  "PHOTO_REPORT",
  "KEY_HANDOVER",
  "PRIORITY",
  "WAITING",
  "WEEKEND",
  "HOLIDAY",
] as const;
export type ServiceOptionId = (typeof SERVICE_OPTION_IDS)[number];

/** Options que le client peut choisir (les autres sont appliquées automatiquement). */
export const SELECTABLE_OPTION_IDS = [
  "PHOTO_INSPECTION",
  "PHOTO_REPORT",
  "KEY_HANDOVER",
  "PRIORITY",
] as const satisfies readonly ServiceOptionId[];
export type SelectableOptionId = (typeof SELECTABLE_OPTION_IDS)[number];

export interface FeeItem {
  id: string;
  label: string;
  amount: number;
}

export interface PackageTier {
  id: PackageId;
  name: string;
  minKm: number;
  /** null = sans limite supérieure (Long Distance). */
  maxKm: number | null;
  basePrice: number;
  pricePerKm: number;
}

export type OptionPricing =
  | { type: "FIXED"; amount: number }
  | { type: "PER_SLICE"; amount: number; sliceMinutes: number }
  | { type: "PERCENT"; percent: number };

export interface ServiceOptionDef {
  id: ServiceOptionId;
  label: string;
  pricing: OptionPricing;
  /** Coût interne éventuel pour Naera (temps, matériel…). */
  internalCost: number;
}

export interface ScoreWeights {
  price: number;
  duration: number;
  connections: number;
  simplicity: number;
}

export interface AppSettings {
  company: {
    name: string;
    /** Ville de rattachement du convoyeur : point de départ de l'aller et d'arrivée du retour. */
    baseCity: string;
  };
  pricing: {
    vatPercent: number;
    hourlyDriverCost: number;
    marginMode: MarginMode;
    marginPercent: number;
    marginFixedAmount: number;
    minimumMarginPercent: number;
    roundingMode: RoundingMode;
    fixedFees: FeeItem[];
    variableFeePerKm: number;
    quoteValidityDays: number;
  };
  fuel: {
    petrolPrice: number;
    dieselPrice: number;
    electricityPrice: number;
    consumption: Record<FuelType, number>;
  };
  times: {
    departureFormalitiesMin: number;
    inspectionMin: number;
    deliveryFormalitiesMin: number;
  };
  transport: {
    companionCostPerKm: number;
    personalVehicleCostPerKm: number;
    vtcBaseFare: number;
    vtcPerKm: number;
    taxiBaseFare: number;
    taxiPerKm: number;
    defaultStrategy: OptimizationStrategy;
    weights: Record<OptimizationStrategy, ScoreWeights>;
  };
  packages: PackageTier[];
  options: ServiceOptionDef[];
}
