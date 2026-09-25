import { assertNonNegative } from "../shared/errors";
import type { AppSettings } from "../settings/types";

export interface MissionDurationInput {
  /** Trajet du convoyeur jusqu'au véhicule. */
  accessMin: number;
  /** Conduite du véhicule (durée avec trafic de préférence). */
  drivingMin: number;
  /** Retour du convoyeur. */
  returnMin: number;
  /** Attente prévue sur place. */
  waitingMin?: number;
}

export interface MissionDurationBreakdown {
  accessMin: number;
  departureFormalitiesMin: number;
  inspectionMin: number;
  drivingMin: number;
  deliveryFormalitiesMin: number;
  waitingMin: number;
  returnMin: number;
  totalMin: number;
}

/**
 * Temps total = trajet vers véhicule + formalités départ + inspection
 * + conduite + formalités livraison (+ attente) + retour convoyeur.
 */
export function calculateMissionDuration(
  input: MissionDurationInput,
  times: AppSettings["times"],
): MissionDurationBreakdown {
  const waitingMin = input.waitingMin ?? 0;
  const parts = {
    accessMin: input.accessMin,
    departureFormalitiesMin: times.departureFormalitiesMin,
    inspectionMin: times.inspectionMin,
    drivingMin: input.drivingMin,
    deliveryFormalitiesMin: times.deliveryFormalitiesMin,
    waitingMin,
    returnMin: input.returnMin,
  };
  for (const [label, value] of Object.entries(parts)) {
    assertNonNegative(value, `Durée (${label})`);
  }
  const totalMin = Object.values(parts).reduce((total, value) => total + value, 0);
  return { ...parts, totalMin: Math.round(totalMin) };
}
