import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Tests de bout en bout HTTP : démarrent le build de production (next start)
 * sur un stockage temporaire. Prérequis : npm run build.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["e2e/**/*.e2e.test.ts"],
    globalSetup: ["e2e/global-setup.ts"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
