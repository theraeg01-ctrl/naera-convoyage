import type { Place } from "@/core/routing/types";
import type { TransportOption } from "@/core/transport/types";
import { findDemoScenario } from "../demo/scenarios";
import { bearingDeg, cityOfPlace } from "../geo/geo";
import { scheduleLeg } from "./schedule";
import type { LegRequest } from "./types";

const PARIS = { lat: 48.8566, lng: 2.3522 };

/** Gare parisienne selon la direction du trajet. */
function parisStationToward(place: Place): string {
  if (!place.point) return "Paris";
  const bearing = bearingDeg(PARIS, place.point);
  if (bearing >= 60 && bearing < 110) return "Paris-Est";
  if (bearing >= 110 && bearing < 185) return "Paris-Gare-de-Lyon";
  if (bearing >= 185 && bearing < 285) return "Paris-Montparnasse";
  if (bearing >= 285 && bearing < 330) return "Paris-Saint-Lazare";
  return "Paris-Nord";
}

function stationOf(place: Place, other: Place): string {
  if (place.city === "Paris") return parisStationToward(other);
  const city = cityOfPlace(place);
  if (city?.station) return city.station;
  return place.city ? `Gare de ${place.city}` : "Gare la plus proche";
}

function isDirect(from: Place, to: Place, distanceKm: number): boolean {
  if (distanceKm < 150 || from.city === "Paris" || to.city === "Paris") return true;
  const a = cityOfPlace(from);
  const b = cityOfPlace(to);
  return Boolean(a && b && a.region === b.region);
}

/**
 * TrainService (simulé) : tarifs et horaires crédibles en attendant
 * l'intégration SNCF. Toujours marqué « SIMULÉ ».
 */
export class TrainService {
  estimate(leg: LegRequest): TransportOption | null {
    if (leg.isLocal || leg.distanceKm === null || leg.distanceKm < 25) return null;
    const demo = findDemoScenario(leg.from.city, leg.to.city);
    const fromStation = stationOf(leg.from, leg.to);
    const toStation = stationOf(leg.to, leg.from);

    let price: number;
    let durationMin: number;
    let connections: number;
    let stations = { fromStation, toStation };
    if (demo) {
      const { train, from } = demo.scenario;
      price = train.price;
      durationMin = train.durationMin;
      connections = train.connections;
      const startsAtScenarioOrigin = leg.from.city === from;
      stations = startsAtScenarioOrigin
        ? { fromStation: train.fromStation, toStation: train.toStation }
        : { fromStation: train.toStation, toStation: train.fromStation };
    } else {
      connections = isDirect(leg.from, leg.to, leg.distanceKm) ? 0 : 1;
      price = Math.round(12 + 0.105 * leg.distanceKm);
      durationMin = Math.round((leg.distanceKm / 165) * 60 + 15 + connections * 40);
    }

    const times = scheduleLeg(leg.direction, leg.anchorTime, durationMin);
    const route = `${stations.fromStation} → ${stations.toStation}`;
    return {
      id: `${leg.direction.toLowerCase()}-train`,
      mode: "TRAIN",
      direction: leg.direction,
      price,
      durationMin,
      connections,
      simplicity: 0.75,
      detail: `${connections === 0 ? "Direct" : `${connections} correspondance`} · ${route}`,
      ...stations,
      ...times,
      distanceKm: leg.distanceKm,
      source: "SIMULATED",
    };
  }
}
