import { assertNonNegative } from "../shared/errors";
import type { OptimizationStrategy, ScoreWeights } from "../settings/types";
import type { TransportOption } from "./types";

export const STRATEGY_LABELS: Record<OptimizationStrategy, string> = {
  CHEAPEST: "Moins cher",
  FASTEST: "Plus rapide",
  BALANCED: "Meilleur compromis",
};

export interface MetricBounds {
  minPrice: number;
  minDuration: number;
}

export function computeBounds(options: readonly TransportOption[]): MetricBounds {
  return {
    minPrice: Math.min(...options.map((option) => option.price)),
    minDuration: Math.min(...options.map((option) => option.durationMin)),
  };
}

/**
 * Écart relatif au meilleur candidat (0 = meilleur, tend vers 1).
 * Contrairement à une normalisation min-max, un écart de 20 € reste faible
 * sur un trajet à 200 € et fort sur un trajet à 5 €, même avec 2 options.
 */
function relativeGap(value: number, best: number): number {
  if (value <= 0 || value <= best) return 0;
  return 1 - best / value;
}

/** 0 correspondance → 0 ; 1 → 0,5 ; 2 → 0,67… */
function connectionPenalty(connections: number): number {
  return connections / (connections + 1);
}

/**
 * Score 0–100 (100 = meilleur). Chaque critère est comparé au meilleur
 * candidat puis pondéré ; les pondérations viennent des paramètres.
 */
export function calculateTransportScore(option: TransportOption, bounds: MetricBounds, weights: ScoreWeights): number {
  assertNonNegative(option.price, "Prix transport");
  assertNonNegative(option.durationMin, "Durée transport");
  assertNonNegative(option.connections, "Correspondances");
  const totalWeight = weights.price + weights.duration + weights.connections + weights.simplicity;
  if (totalWeight === 0) return 100;
  const penalty =
    weights.price * relativeGap(option.price, bounds.minPrice) +
    weights.duration * relativeGap(option.durationMin, bounds.minDuration) +
    weights.connections * connectionPenalty(option.connections) +
    weights.simplicity * (1 - Math.min(1, Math.max(0, option.simplicity)));
  return Math.round(100 * (1 - penalty / totalWeight));
}

export interface RankedTransportOption {
  option: TransportOption;
  score: number;
  rank: number;
  isRecommended: boolean;
  isCheapest: boolean;
  isFastest: boolean;
}

/** Classe les options selon la stratégie ; départage par prix puis durée. */
export function rankTransportOptions(
  options: readonly TransportOption[],
  strategy: OptimizationStrategy,
  weightsByStrategy: Record<OptimizationStrategy, ScoreWeights>,
): RankedTransportOption[] {
  if (options.length === 0) return [];
  const bounds = computeBounds(options);
  const weights = weightsByStrategy[strategy];
  return options
    .map((option) => ({ option, score: calculateTransportScore(option, bounds, weights) }))
    .sort((a, b) => b.score - a.score || a.option.price - b.option.price || a.option.durationMin - b.option.durationMin)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      isRecommended: index === 0,
      isCheapest: entry.option.price === bounds.minPrice,
      isFastest: entry.option.durationMin === bounds.minDuration,
    }));
}

export function recommendationReason(strategy: OptimizationStrategy): string {
  switch (strategy) {
    case "CHEAPEST":
      return "Le moins cher";
    case "FASTEST":
      return "Le plus rapide";
    case "BALANCED":
      return "Meilleur compromis prix / durée";
  }
}
