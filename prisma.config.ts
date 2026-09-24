import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx --conditions=react-server prisma/seed.ts",
  },
  datasource: {
    // Optionnel : sans DATABASE_URL, l'application utilise le stockage local de démonstration.
    url: process.env.DATABASE_URL,
  },
});
