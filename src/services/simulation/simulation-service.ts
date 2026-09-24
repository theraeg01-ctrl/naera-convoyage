import type { DataSource, Place, RouteOption } from "@/core/routing/types";
import { addMinutesToTime } from "@/core/shared/calendar";
import type { AppSettings } from "@/core/settings/types";
import type { DataMode, MissionRequest, SimulationNotice, SimulationResult } from "@/core/simulation/types";
import type { LegDirection, TransportOption } from "@/core/transport/types";
import { findDemoScenario } from "../demo/scenarios";
import { estimateRoadKm, resolvePlace, samePlace } from "../geo/geo";
import { RoutingService } from "../routing/routing-service";
import { ReturnTransportService } from "../transport/return-transport-service";
import type { LegRequest } from "../transport/types";

function manualRouteOption(manual: NonNullable<MissionRequest["manualRoute"]>): RouteOption {
  return {
    kind: "FASTEST",
    distanceKm: manual.distanceKm,
    durationMin: manual.durationMin,
    trafficDurationMin: manual.durationMin,
    tollsEur: manual.tollsEur,
    summary: "Itinéraire saisi manuellement",
    source: "MANUAL",
  };
}

function dataModeOf(sources: DataSource[]): DataMode {
  const external = sources.filter((source) => source !== "MANUAL");
  if (external.length === 0 || external.every((source) => source === "SIMULATED")) return "DEMO";
  if (external.every((source) => source !== "SIMULATED")) return "LIVE";
  return "MIXED";
}

interface LegContext {
  direction: LegDirection;
  from: Place;
  to: Place;
  route: RouteOption | null;
  /** true si le trajet emprunte le même axe que la mission (distance réutilisable). */
  mirrorsRoute: boolean;
  date: string;
  anchorTime: string;
}

function buildLeg(context: LegContext): LegRequest {
  const base = {
    direction: context.direction,
    from: context.from,
    to: context.to,
    date: context.date,
    anchorTime: context.anchorTime,
  };
  if (samePlace(context.from, context.to)) {
    return { ...base, distanceKm: null, roadDurationMin: null, roadSource: "SIMULATED", isLocal: true };
  }
  if (context.mirrorsRoute && context.route) {
    return {
      ...base,
      distanceKm: context.route.distanceKm,
      roadDurationMin: context.route.trafficDurationMin,
      roadSource: context.route.source,
      isLocal: false,
    };
  }
  if (context.from.point && context.to.point) {
    const distanceKm = estimateRoadKm(context.from.point, context.to.point);
    return {
      ...base,
      distanceKm,
      roadDurationMin: Math.round((distanceKm / (distanceKm < 60 ? 55 : 95)) * 60 + 8),
      roadSource: "SIMULATED",
      isLocal: false,
    };
  }
  return { ...base, distanceKm: null, roadDurationMin: null, roadSource: "SIMULATED", isLocal: false };
}

/**
 * Orchestration d'une simulation : localisation, itinéraires (RoutingService),
 * solutions d'aller et de retour du convoyeur (ReturnTransportService).
 * Le tarif est ensuite calculé par le moteur métier (resolveSimulation).
 */
export class SimulationService {
  constructor(private readonly routing: RoutingService) {}

  async run(request: MissionRequest, settings: AppSettings, now: Date = new Date()): Promise<SimulationResult> {
    const pickup = resolvePlace(request.pickupAddress);
    const dropoff = resolvePlace(request.dropoffAddress);
    const baseCandidate = resolvePlace(settings.company.baseCity);
    const base = baseCandidate.point ? baseCandidate : pickup;
    const notices: SimulationNotice[] = [];

    let routes: RouteOption[];
    if (request.manualRoute) {
      routes = [manualRouteOption(request.manualRoute)];
    } else {
      const outcome = await this.routing.computeRoutes({
        origin: pickup,
        destination: dropoff,
        departure: { date: request.date, time: request.time },
      });
      routes = outcome.routes;
      notices.push(...outcome.notices);
    }
    const mainRoute = routes[0] ?? null;

    const { times } = settings;
    const readyAt = addMinutesToTime(
      request.time,
      times.departureFormalitiesMin +
        times.inspectionMin +
        (mainRoute?.trafficDurationMin ?? 0) +
        times.deliveryFormalitiesMin +
        request.waitingMin,
    ).time;

    const transport = new ReturnTransportService(settings);
    const accessOptions = transport.compare(
      buildLeg({
        direction: "ACCESS",
        from: base,
        to: pickup,
        route: mainRoute,
        mirrorsRoute: samePlace(base, dropoff),
        date: request.date,
        anchorTime: request.time,
      }),
      request.accessMode,
      request.manualAccess,
    );
    const returnOptions = transport.compare(
      buildLeg({
        direction: "RETURN",
        from: dropoff,
        to: base,
        route: mainRoute,
        mirrorsRoute: samePlace(base, pickup),
        date: request.date,
        anchorTime: readyAt,
      }),
      request.returnMode,
      request.manualReturn,
    );
    if (mainRoute && returnOptions.length === 0) {
      notices.push({ level: "warning", message: "Retour du convoyeur non estimable : ajoute un prix manuellement." });
    }

    const sources: DataSource[] = [
      ...routes.map((route) => route.source),
      ...[...accessOptions, ...returnOptions].map((option: TransportOption) => option.source),
    ];
    const dataMode = dataModeOf(sources);
    const demo = dataMode === "DEMO" ? findDemoScenario(pickup.city, dropoff.city) : null;

    return {
      request,
      pickup,
      dropoff,
      base,
      routes,
      accessOptions,
      returnOptions,
      dataMode,
      demoScenario: demo
        ? `${demo.reversed ? demo.scenario.to : demo.scenario.from} → ${demo.reversed ? demo.scenario.from : demo.scenario.to}`
        : null,
      notices,
      generatedAt: now.toISOString(),
    };
  }
}
