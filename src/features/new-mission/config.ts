import type { FuelType, OptimizationStrategy, SelectableOptionId } from "@/core/settings/types";

/** Valeurs issues des paramètres, transmises par la page serveur à l'écran de saisie. */
export interface NewMissionConfig {
  defaultDate: string;
  defaultTime: string;
  defaultStrategy: OptimizationStrategy;
  consumption: Record<FuelType, number>;
  marginSummary: string;
  baseCity: string;
  options: { id: SelectableOptionId; label: string; priceLabel: string }[];
  waitingPriceLabel: string;
  demoScenarios: { id: string; label: string; from: string; to: string }[];
}
