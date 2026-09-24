import "server-only";
import path from "node:path";
import { serverConfig } from "@/services/config";
import { createFileRepositories } from "./file/file-repositories";
import type { Repositories } from "./types";

const globalForRepositories = globalThis as unknown as { naeraRepositories?: Promise<Repositories> };

async function createRepositories(): Promise<Repositories> {
  const databaseUrl = serverConfig.databaseUrl;
  if (databaseUrl) {
    // Import différé : le pilote PostgreSQL n'est chargé que s'il est configuré.
    const { createPrismaRepositories } = await import("./prisma/prisma-repositories");
    return createPrismaRepositories(databaseUrl);
  }
  const directory = serverConfig.localDataDir ?? path.join(process.cwd(), ".data");
  return createFileRepositories(directory);
}

/**
 * Dépôts de données : PostgreSQL (Prisma) si DATABASE_URL est défini,
 * sinon stockage local JSON pour la démonstration.
 */
export function getRepositories(): Promise<Repositories> {
  globalForRepositories.naeraRepositories ??= createRepositories();
  return globalForRepositories.naeraRepositories;
}
