import type { MarginPolicy } from "../pricing/margin";
import type { Place, RouteKind, RouteOption } from "../routing/types";
import type { FuelType, OptimizationStrategy, SelectableOptionId, VehicleCategory } from "../settings/types";
import type { TransportMode, TransportOption } from "../transport/types";

export type TransportPreference = "AUTO" | TransportMode;

export interface ManualLeg {
  price: number;
  durationMin: number;
  label?: string;
}

/** Saisie de l'écran « Nouvelle mission » (étape 1 + options avancées). */
export interface MissionRequest {
  pickupAddress: string;
  dropoffAddress: string;
  date: string;
  time: string;
  vehicle: {
    category: VehicleCategory;
    fuelType: FuelType;
    consumptionPer100?: number;
  };
  accessMode: TransportPreference;
  returnMode: TransportPreference;
  strategy: OptimizationStrategy;
  margin?: MarginPolicy;
  waitingMin: number;
  optionIds: SelectableOptionId[];
  /** Saisie de secours si l'itinéraire n'a pas pu être calculé. */
  manualRoute?: { distanceKm: number; durationMin: number; tollsEur: number };
  manualAccess?: ManualLeg;
  manualReturn?: ManualLeg;
}

export type DataMode = "DEMO" | "LIVE" | "MIXED";

export interface SimulationNotice {
  level: "info" | "warning";
  message: string;
}

/** Données brutes collectées par les services (itinéraires, transports). */
export interface SimulationResult {
  request: MissionRequest;
  pickup: Place;
  dropoff: Place;
  base: Place;
  routes: RouteOption[];
  accessOptions: TransportOption[];
  returnOptions: TransportOption[];
  dataMode: DataMode;
  /** Nom du scénario de démonstration reconnu, le cas échéant. */
  demoScenario: string | null;
  notices: SimulationNotice[];
  generatedAt: string;
}

/** Corrections manuelles apportées sur l'écran résultat. */
export interface ManualOverrides {
  distanceKm?: number;
  durationMin?: number;
  tollsEur?: number;
  returnPrice?: number;
}

/** Choix de l'utilisateur sur l'écran résultat (null = recommandation automatique). */
export interface SimulationSelections {
  routeKind: RouteKind;
  strategy: OptimizationStrategy;
  accessOptionId: string | null;
  returnOptionId: string | null;
  overrides: ManualOverrides;
}
