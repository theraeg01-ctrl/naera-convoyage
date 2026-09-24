import "server-only";
import { getRepositories } from "@/repositories";
import { serverConfig } from "./config";
import { MissionService } from "./mission/mission-service";
import { PlacesService } from "./places/places-service";
import { GoogleRoutesProvider } from "./routing/google-routes-provider";
import { MockRoutingProvider } from "./routing/mock-routing-provider";
import { RoutingService } from "./routing/routing-service";
import { SimulationService } from "./simulation/simulation-service";

/**
 * Assemblage des services côté serveur. Chaque adaptateur externe est
 * choisi selon la configuration ; à défaut, la version simulée est utilisée.
 */
let simulationService: SimulationService | undefined;
let demoSimulationService: SimulationService | undefined;
let placesService: PlacesService | undefined;

export function getSimulationService(): SimulationService {
  if (!simulationService) {
    const key = serverConfig.googleMapsApiKey;
    const primary = key ? new GoogleRoutesProvider(key) : new MockRoutingProvider();
    simulationService = new SimulationService(new RoutingService(primary));
  }
  return simulationService;
}

/** Les données de démonstration utilisent toujours les valeurs simulées. */
function getDemoSimulationService(): SimulationService {
  demoSimulationService ??= new SimulationService(new RoutingService(new MockRoutingProvider()));
  return demoSimulationService;
}

export function getPlacesService(): PlacesService {
  placesService ??= new PlacesService();
  return placesService;
}

export async function getMissionService(): Promise<MissionService> {
  return new MissionService(await getRepositories(), getDemoSimulationService());
}
