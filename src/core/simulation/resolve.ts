import { buildMissionInsights, type MissionInsight } from "../insights/optimize";
import { computeMissionPricing, type MissionPricing } from "../pricing/mission-pricing";
import type { RouteOption } from "../routing/types";
import type { AppSettings, OptimizationStrategy } from "../settings/types";
import { rankTransportOptions, type RankedTransportOption } from "../transport/score";
import type { TransportOption } from "../transport/types";
import type { ManualOverrides, SimulationResult, SimulationSelections, TransportPreference } from "./types";

export interface ResolvedLeg {
  ranked: RankedTransportOption[];
  recommended: TransportOption | null;
  selected: TransportOption | null;
}

export interface ResolvedSimulation {
  route: RouteOption;
  access: ResolvedLeg;
  return: ResolvedLeg;
  pricing: MissionPricing;
  insights: MissionInsight[];
}

export function defaultSelections(simulation: SimulationResult): SimulationSelections {
  return {
    routeKind: "FASTEST",
    strategy: simulation.request.strategy,
    accessOptionId: null,
    returnOptionId: null,
    overrides: {},
  };
}

/** Itinéraire choisi, corrigé des saisies manuelles éventuelles. */
export function selectRoute(
  routes: readonly RouteOption[],
  kind: RouteOption["kind"],
  overrides: ManualOverrides,
): RouteOption | null {
  const base = routes.find((route) => route.kind === kind) ?? routes[0];
  const hasOverride =
    overrides.distanceKm !== undefined || overrides.durationMin !== undefined || overrides.tollsEur !== undefined;
  if (!base && overrides.distanceKm === undefined) return null;
  if (!hasOverride && base) return base;
  const durationMin = overrides.durationMin ?? base?.durationMin ?? Math.round(((overrides.distanceKm ?? 0) / 90) * 60);
  return {
    kind: base?.kind ?? "FASTEST",
    distanceKm: overrides.distanceKm ?? base?.distanceKm ?? 0,
    durationMin,
    trafficDurationMin: overrides.durationMin ?? base?.trafficDurationMin ?? durationMin,
    tollsEur: overrides.tollsEur ?? base?.tollsEur ?? 0,
    summary: base?.summary ?? "Itinéraire saisi manuellement",
    polyline: hasOverride ? undefined : base?.polyline,
    source: "MANUAL",
  };
}

function resolveLeg(
  options: readonly TransportOption[],
  strategy: OptimizationStrategy,
  settings: AppSettings,
  explicitId: string | null,
  preference: TransportPreference,
  priceOverride?: number,
): ResolvedLeg {
  const ranked = rankTransportOptions(options, strategy, settings.transport.weights);
  const recommended = ranked[0]?.option ?? null;
  const byId = explicitId ? options.find((option) => option.id === explicitId) : undefined;
  const byPreference = preference === "AUTO" ? undefined : options.find((option) => option.mode === preference);
  const chosen = byId ?? byPreference ?? recommended;
  const selected =
    chosen && priceOverride !== undefined ? { ...chosen, price: priceOverride, source: "MANUAL" as const } : chosen;
  return { ranked, recommended, selected };
}

/**
 * Combine les données brutes d'une simulation et les choix de l'utilisateur
 * pour produire le tarif. Fonction pure : exécutée côté client pour un
 * recalcul instantané, et côté serveur (source de vérité) à l'enregistrement.
 * Renvoie null tant qu'aucun itinéraire n'est disponible (saisie manuelle requise).
 */
export function resolveSimulation(
  simulation: SimulationResult,
  selections: SimulationSelections,
  settings: AppSettings,
): ResolvedSimulation | null {
  const route = selectRoute(simulation.routes, selections.routeKind, selections.overrides);
  if (!route) return null;
  const { request } = simulation;
  const access = resolveLeg(
    simulation.accessOptions,
    selections.strategy,
    settings,
    selections.accessOptionId,
    request.accessMode,
  );
  const returnLeg = resolveLeg(
    simulation.returnOptions,
    selections.strategy,
    settings,
    selections.returnOptionId,
    request.returnMode,
    selections.overrides.returnPrice,
  );

  const pricing = computeMissionPricing(
    {
      route: { distanceKm: route.distanceKm, drivingMin: route.trafficDurationMin, tollsEur: route.tollsEur },
      vehicle: { fuelType: request.vehicle.fuelType, consumptionPer100: request.vehicle.consumptionPer100 },
      access: { cost: access.selected?.price ?? 0, durationMin: access.selected?.durationMin ?? 0 },
      return: { cost: returnLeg.selected?.price ?? 0, durationMin: returnLeg.selected?.durationMin ?? 0 },
      date: request.date,
      waitingMin: request.waitingMin,
      optionIds: request.optionIds,
      marginOverride: request.margin,
    },
    settings,
  );

  const insights = buildMissionInsights({
    routes: simulation.routes,
    route,
    returnLeg,
    pricing,
    time: request.time,
    settings,
  });

  return { route, access, return: returnLeg, pricing, insights };
}
