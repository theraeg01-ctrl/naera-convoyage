/**
 * Initialise une base PostgreSQL : paramètres par défaut + missions de démonstration.
 * Usage : npm run db:seed (DATABASE_URL requis).
 */
import "dotenv/config";
import { DEFAULT_SETTINGS } from "../src/core/settings/defaults";
import { createPrismaRepositories } from "../src/repositories/prisma/prisma-repositories";
import { MissionService } from "../src/services/mission/mission-service";
import { MockRoutingProvider } from "../src/services/routing/mock-routing-provider";
import { RoutingService } from "../src/services/routing/routing-service";
import { SimulationService } from "../src/services/simulation/simulation-service";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL est requis pour initialiser la base.");
  const repositories = createPrismaRepositories(databaseUrl);

  if (!(await repositories.settings.get())) {
    await repositories.settings.save(DEFAULT_SETTINGS);
    console.log("✓ Paramètres de tarification initialisés");
  }

  const missions = new MissionService(
    { ...repositories, demoSeeded: async () => false },
    new SimulationService(new RoutingService(new MockRoutingProvider())),
  );
  const before = await repositories.missions.count();
  await missions.seedDemo();
  const after = await repositories.missions.count();
  console.log(
    after > before
      ? `✓ ${after - before} missions de démonstration créées`
      : "• Missions déjà présentes : aucune donnée de démonstration ajoutée",
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
