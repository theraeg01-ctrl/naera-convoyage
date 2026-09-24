import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Mission } from "@/core/mission/types";
import type { AppSettings } from "@/core/settings/types";

export interface LocalStoreData {
  version: 1;
  missions: Mission[];
  settings: AppSettings | null;
  demoSeeded: boolean;
}

const EMPTY_STORE: LocalStoreData = { version: 1, missions: [], settings: null, demoSeeded: false };

/**
 * Stockage JSON local pour la démonstration sans base de données.
 * Écritures sérialisées (file d'attente en mémoire) et atomiques (fichier
 * temporaire + renommage). Non adapté à la production : utiliser PostgreSQL.
 */
export class LocalFileStore {
  private queue: Promise<unknown> = Promise.resolve();
  private readonly filePath: string;

  constructor(directory: string) {
    this.filePath = path.join(directory, "naera-store.json");
  }

  private async readRaw(): Promise<LocalStoreData> {
    try {
      const content = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(content) as Partial<LocalStoreData>;
      return { ...EMPTY_STORE, ...parsed, missions: parsed.missions ?? [] };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(EMPTY_STORE);
      throw error;
    }
  }

  private async writeRaw(data: LocalStoreData): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await rename(tmp, this.filePath);
  }

  read(): Promise<LocalStoreData> {
    return this.enqueue(() => this.readRaw());
  }

  /** Lecture-modification-écriture exclusive. */
  update<T>(mutate: (data: LocalStoreData) => T): Promise<T> {
    return this.enqueue(async () => {
      const data = await this.readRaw();
      const result = mutate(data);
      await this.writeRaw(data);
      return result;
    });
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }
}
