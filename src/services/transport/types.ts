import type { DataSource, Place } from "@/core/routing/types";
import type { LegDirection } from "@/core/transport/types";

/** Trajet du convoyeur à estimer (aller vers le véhicule ou retour). */
export interface LegRequest {
  direction: LegDirection;
  from: Place;
  to: Place;
  /** Distance routière du trajet (null si non estimable). */
  distanceKm: number | null;
  /** Durée routière (pour VTC, taxi, accompagnateur). */
  roadDurationMin: number | null;
  /** Origine de la distance : un itinéraire live rend les estimations « ESTIMÉES ». */
  roadSource: DataSource;
  /** true si départ et arrivée sont dans la même ville. */
  isLocal: boolean;
  date: string;
  /** ACCESS : heure d'arrivée souhaitée ; RETURN : heure à partir de laquelle partir. */
  anchorTime: string;
}

export function derivedSource(roadSource: DataSource): DataSource {
  return roadSource === "LIVE" || roadSource === "MANUAL" ? "ESTIMATED" : "SIMULATED";
}
