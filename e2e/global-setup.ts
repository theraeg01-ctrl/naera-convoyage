import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { BASE_URL, E2E_PORT, E2E_SECRET } from "./support";

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // Serveur pas encore prêt.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Le serveur ${url} n'a pas démarré à temps.`);
}

/** Démarre le build de production sur un stockage temporaire (données de démonstration fraîches). */
export default async function setup() {
  if (!existsSync(path.join(process.cwd(), ".next", "BUILD_ID"))) {
    throw new Error("Build de production introuvable : lancez « npm run build » avant « npm run test:e2e ».");
  }
  const dataDir = await mkdtemp(path.join(tmpdir(), "naera-e2e-"));
  const server: ChildProcess = spawn(
    process.execPath,
    [path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(E2E_PORT)],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        NAERA_DEMO_AUTH: "true",
        NAERA_SESSION_SECRET: E2E_SECRET,
        LOCAL_DATA_DIR: dataDir,
        DATABASE_URL: "",
      },
      stdio: "ignore",
    },
  );
  await waitForServer(`${BASE_URL}/`, 60_000);
  return async () => {
    server.kill("SIGTERM");
    await rm(dataDir, { recursive: true, force: true });
  };
}
