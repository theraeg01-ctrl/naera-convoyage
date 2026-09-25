import type { RouteOption } from "@/core/routing/types";
import { dayOfWeek, timeToMinutes } from "@/core/shared/calendar";
import { findDemoScenario } from "../demo/scenarios";
import { estimateRoadKm } from "../geo/geo";
import { RoutingUnavailableError, type RoutingProvider, type RoutingRequest } from "./types";

/** Coefficient de trafic simulé selon le jour et l'heure de départ. */
export function simulatedTrafficFactor(date: string, time: string): number {
  const minutes = timeToMinutes(time);
  const day = dayOfWeek(date);
  const weekend = day === 0 || day === 6;
  const between = (from: number, to: number) => minutes >= from && minutes < to;
  if (between(0, 6 * 60) || minutes >= 21 * 60) return 1;
  if (weekend) return 1.04;
  if (between(7 * 60, 9 * 60 + 30) || between(16 * 60 + 30, 19 * 60 + 30)) return 1.15;
  return 1.06;
}

/** Vitesse moyenne simulée selon la distance (urbain → autoroute). */
function averageSpeedKmh(distanceKm: number): number {
  if (distanceKm < 30) return 38;
  if (distanceKm < 100) return 70;
  return 98;
}

function estimateTolls(distanceKm: number): number {
  if (distanceKm < 60) return 0;
  return Math.round(distanceKm * 0.8 * 0.1 * 10) / 10;
}

function variants(base: Omit<RouteOption, "kind" | "trafficDurationMin">, factor: number): RouteOption[] {
  const fastest: RouteOption = { ...base, kind: "FASTEST", trafficDurationMin: Math.round(base.durationMin * factor) };
  if (base.tollsEur === 0) return [fastest];
  const economicDuration = Math.round(base.durationMin * 1.12);
  const noTollDuration = Math.round(base.durationMin * 1.35);
  return [
    fastest,
    {
      ...base,
      kind: "ECONOMIC",
      distanceKm: Math.round(base.distanceKm * 0.97),
      durationMin: economicDuration,
      trafficDurationMin: Math.round(economicDuration * factor),
      tollsEur: Math.round(base.tollsEur * 0.55 * 10) / 10,
      summary: `${base.summary} partiel + nationales`,
    },
    {
      ...base,
      kind: "NO_TOLL",
      distanceKm: Math.round(base.distanceKm * 1.05),
      durationMin: noTollDuration,
      trafficDurationMin: Math.round(noTollDuration * factor),
      tollsEur: 0,
      summary: "Routes nationales",
    },
  ];
}

/**
 * Itinéraires simulés : valeurs fixes pour les scénarios de démonstration,
 * estimation à partir des coordonnées sinon.
 */
export class MockRoutingProvider implements RoutingProvider {
  readonly id = "mock" as const;

  async computeRoutes({ origin, destination, departure }: RoutingRequest): Promise<RouteOption[]> {
    const factor = simulatedTrafficFactor(departure.date, departure.time);
    const demo = findDemoScenario(origin.city, destination.city);
    if (demo) {
      const { scenario } = demo;
      return variants(
        {
          distanceKm: scenario.distanceKm,
          durationMin: scenario.durationMin,
          tollsEur: scenario.tollsEur,
          summary: scenario.summary,
          source: "SIMULATED",
        },
        factor,
      );
    }
    if (!origin.point || !destination.point) {
      throw new RoutingUnavailableError(
        "UNKNOWN_PLACE",
        `Adresse non localisée : ${origin.point ? destination.label : origin.label}`,
      );
    }
    const distanceKm = estimateRoadKm(origin.point, destination.point);
    const durationMin = Math.round((distanceKm / averageSpeedKmh(distanceKm)) * 60 + 8);
    return variants(
      {
        distanceKm,
        durationMin,
        tollsEur: estimateTolls(distanceKm),
        summary: distanceKm >= 60 ? "Autoroutes" : "Itinéraire local",
        source: "SIMULATED",
      },
      factor,
    );
  }
}
