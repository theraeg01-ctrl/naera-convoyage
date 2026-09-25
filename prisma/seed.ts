/**
 * Initialise une base PostgreSQL : paramètres par défaut + jeu de démonstration
 * multi-portails (comptes, rôles, plans, convoyeurs, missions, factures).
 * Usage : npm run db:seed (DATABASE_URL requis). Les données réelles sont conservées.
 */
import "dotenv/config";
import { DEFAULT_SETTINGS } from "../src/core/settings/defaults";
import { createPrismaRepositories } from "../src/repositories/prisma/prisma-repositories";
import { DEMO_DATASET_VERSION, seedDemoDataset } from "../src/services/demo/demo-seeder";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL est requis pour initialiser la base.");
  const repositories = createPrismaRepositories(databaseUrl);

  if (!(await repositories.settings.get())) {
    await repositories.settings.save(DEFAULT_SETTINGS);
    console.log("✓ Paramètres de tarification initialisés");
  }

  const report = await seedDemoDataset(repositories);
  console.log(
    `✓ Jeu de démonstration v${DEMO_DATASET_VERSION} : ${report.missions} missions, ${report.invoices} factures`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
