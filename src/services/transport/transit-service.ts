import type { TransportOption } from "@/core/transport/types";
import { scheduleLeg } from "./schedule";
import type { LegRequest } from "./types";

/**
 * TransitService (simulé) : RER, métro, bus, cars longue distance.
 * Prévu pour être remplacé par Navitia.
 */
export class TransitService {
  estimate(leg: LegRequest): TransportOption | null {
    const id = `${leg.direction.toLowerCase()}-transit`;
    if (leg.isLocal) {
      const inParis = leg.from.city === "Paris";
      return {
        id,
        mode: "PUBLIC_TRANSIT",
        direction: leg.direction,
        price: inParis ? 4.3 : 2,
        durationMin: inParis ? 40 : 30,
        connections: 1,
        simplicity: 0.6,
        detail: inParis ? "RER + métro" : "Tram / bus",
        source: "SIMULATED",
      };
    }
    if (leg.distanceKm === null || leg.distanceKm > 900) return null;
    const distanceKm = leg.distanceKm;
    const durationMin = Math.round((distanceKm / 85) * 60 + 15);
    return {
      id,
      mode: "PUBLIC_TRANSIT",
      direction: leg.direction,
      price: Math.round((8 + 0.06 * distanceKm) * 10) / 10,
      durationMin,
      connections: distanceKm > 300 ? 2 : 1,
      simplicity: 0.5,
      detail: distanceKm > 150 ? "Car longue distance + transports locaux" : "TER + bus",
      ...scheduleLeg(leg.direction, leg.anchorTime, durationMin),
      distanceKm,
      source: "SIMULATED",
    };
  }
}
