import type { RouteOption } from "@/core/routing/types";
import type { SimulationNotice } from "@/core/simulation/types";
import { logTechnicalError } from "../logger";
import { MockRoutingProvider } from "./mock-routing-provider";
import { RoutingUnavailableError, type RoutingProvider, type RoutingRequest } from "./types";

export const ROUTING_FAILURE_MESSAGE =
  "Impossible de récupérer l'itinéraire actuellement. Tu peux entrer les kilomètres manuellement.";

export interface RoutingOutcome {
  routes: RouteOption[];
  notices: SimulationNotice[];
}

/**
 * RoutingService : interroge le fournisseur configuré (Google Routes) et
 * bascule sur l'estimation simulée en cas d'absence ou d'échec de l'API.
 * Ne lève jamais d'erreur : un échec renvoie une liste vide et un message clair.
 */
export class RoutingService {
  constructor(
    private readonly primary: RoutingProvider,
    private readonly fallback: RoutingProvider = new MockRoutingProvider(),
  ) {}

  get isLive(): boolean {
    return this.primary.id !== "mock";
  }

  async computeRoutes(request: RoutingRequest): Promise<RoutingOutcome> {
    const notices: SimulationNotice[] = [];
    if (this.primary.id !== "mock") {
      try {
        return { routes: await this.primary.computeRoutes(request), notices };
      } catch (error) {
        logTechnicalError(`RoutingService (${this.primary.id})`, error);
        notices.push({
          level: "warning",
          message: "Itinéraire en temps réel indisponible : estimation simulée affichée.",
        });
      }
    }
    try {
      return { routes: await this.fallback.computeRoutes(request), notices };
    } catch (error) {
      if (!(error instanceof RoutingUnavailableError)) logTechnicalError("RoutingService (mock)", error);
      notices.push({ level: "warning", message: ROUTING_FAILURE_MESSAGE });
      return { routes: [], notices };
    }
  }
}
