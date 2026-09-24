import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { naeraPrisma?: PrismaClient };

/** Client Prisma unique (réutilisé entre rechargements à chaud en développement). */
export function getPrismaClient(connectionString: string): PrismaClient {
  if (!globalForPrisma.naeraPrisma) {
    globalForPrisma.naeraPrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }
  return globalForPrisma.naeraPrisma;
}
