import type { AppSettings } from "@/core/settings/types";
import type { TransportOption } from "@/core/transport/types";
import { derivedSource, type LegRequest } from "./types";

const LOCAL_DISTANCE_KM = 8;
const LOCAL_DURATION_MIN = 25;

function legMetrics(leg: LegRequest): { distanceKm: number; durationMin: number } | null {
  if (leg.isLocal) return { distanceKm: LOCAL_DISTANCE_KM, durationMin: LOCAL_DURATION_MIN };
  if (leg.distanceKm === null) return null;
  return {
    distanceKm: leg.distanceKm,
    durationMin: leg.roadDurationMin ?? Math.round((leg.distanceKm / 90) * 60),
  };
}

/**
 * VtcService : estimation VTC (Uber…) et taxi à partir des tarifs paramétrés.
 * Prévu pour être remplacé par l'API Uber pour le VTC.
 */
export class VtcService {
  constructor(private readonly transport: AppSettings["transport"]) {}

  estimateVtc(leg: LegRequest): TransportOption | null {
    const metrics = legMetrics(leg);
    if (!metrics) return null;
    return {
      id: `${leg.direction.toLowerCase()}-vtc`,
      mode: "VTC",
      direction: leg.direction,
      price: Math.round(this.transport.vtcBaseFare + this.transport.vtcPerKm * metrics.distanceKm),
      durationMin: metrics.durationMin,
      connections: 0,
      simplicity: 1,
      detail: "Porte-à-porte · prix estimé",
      distanceKm: metrics.distanceKm,
      source: leg.isLocal ? "SIMULATED" : derivedSource(leg.roadSource),
    };
  }

  estimateTaxi(leg: LegRequest): TransportOption | null {
    const metrics = legMetrics(leg);
    if (!metrics) return null;
    return {
      id: `${leg.direction.toLowerCase()}-taxi`,
      mode: "TAXI",
      direction: leg.direction,
      price: Math.round(this.transport.taxiBaseFare + this.transport.taxiPerKm * metrics.distanceKm),
      durationMin: metrics.durationMin,
      connections: 0,
      simplicity: 1,
      detail: "Porte-à-porte · tarif compteur estimé",
      distanceKm: metrics.distanceKm,
      source: leg.isLocal ? "SIMULATED" : derivedSource(leg.roadSource),
    };
  }
}
