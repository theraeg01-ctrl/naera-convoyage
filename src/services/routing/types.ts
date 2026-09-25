import type { Place, RouteOption } from "@/core/routing/types";

export interface RoutingRequest {
  origin: Place;
  destination: Place;
  /** Date et heure locales (Paris) du départ prévu. */
  departure: { date: string; time: string };
}

export interface RoutingProvider {
  readonly id: "mock" | "google-routes";
  computeRoutes(request: RoutingRequest): Promise<RouteOption[]>;
}

export type RoutingFailureReason = "UNKNOWN_PLACE" | "NO_ROUTE" | "PROVIDER_ERROR";

/** Échec d'itinéraire : le message technique est journalisé, jamais affiché. */
export class RoutingUnavailableError extends Error {
  constructor(
    readonly reason: RoutingFailureReason,
    message: string,
  ) {
    super(message);
    this.name = "RoutingUnavailableError";
  }
}
