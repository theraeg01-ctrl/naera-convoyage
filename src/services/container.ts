import "server-only";
import { getRepositories } from "@/repositories";
import type { Repositories } from "@/repositories/types";
import { serverConfig } from "./config";
import { DEMO_DATASET_VERSION, seedDemoDataset } from "./demo/demo-seeder";
import { logTechnicalError } from "./logger";
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
let placesService: PlacesService | undefined;

const globalForDemo = globalThis as unknown as { naeraDemoSeeding?: Promise<void> };

/** Stockage local : le jeu de démonstration est injecté (ou mis à niveau) automatiquement. */
function ensureLocalDemoData(repositories: Repositories): Promise<void> {
  globalForDemo.naeraDemoSeeding ??= (async () => {
    if ((await repositories.demo.currentVersion()) >= DEMO_DATASET_VERSION) return;
    await seedDemoDataset(repositories);
  })().catch((error) => {
    logTechnicalError("Injection des données de démonstration", error);
    globalForDemo.naeraDemoSeeding = undefined;
  });
  return globalForDemo.naeraDemoSeeding;
}

/** Dépôts prêts à l'emploi (PostgreSQL : données de démonstration via npm run db:seed). */
export async function getAppRepositories(): Promise<Repositories> {
  const repositories = await getRepositories();
  if (repositories.kind === "local-file") await ensureLocalDemoData(repositories);
  return repositories;
}

export function getSimulationService(): SimulationService {
  if (!simulationService) {
    const key = serverConfig.googleMapsApiKey;
    const primary = key ? new GoogleRoutesProvider(key) : new MockRoutingProvider();
    simulationService = new SimulationService(new RoutingService(primary));
  }
  return simulationService;
}

export function getPlacesService(): PlacesService {
  placesService ??= new PlacesService();
  return placesService;
}

export async function getMissionService(): Promise<MissionService> {
  return new MissionService(await getAppRepositories(), getSimulationService());
}
