import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Invoice } from "@/core/accounts/types";
import { DEFAULT_OWNERSHIP, type Mission } from "@/core/mission/types";
import { normalizeStoredPricing } from "@/core/pricing/mission-pricing";
import type { AppSettings } from "@/core/settings/types";
import type { DirectorySeed } from "../types";

export interface LocalStoreData {
  version: 2;
  missions: Mission[];
  settings: AppSettings | null;
  /** Version du jeu de démonstration injecté (0 = jamais). */
  demoVersion: number;
  directory: DirectorySeed;
  invoices: Invoice[];
}

export const EMPTY_DIRECTORY: DirectorySeed = {
  users: [],
  personalCustomers: [],
  businessAccounts: [],
  members: [],
  drivers: [],
  plans: [],
  subscriptions: [],
  overrides: [],
};

const EMPTY_STORE: LocalStoreData = {
  version: 2,
  missions: [],
  settings: null,
  demoVersion: 0,
  directory: EMPTY_DIRECTORY,
  invoices: [],
};

/** Forme enregistrée par les versions antérieures (champs renommés depuis). */
type StoredMission = Mission & { customer?: Mission["customerSnapshot"] };

/**
 * Complète une mission enregistrée par une version antérieure : rattachement,
 * affectation, snapshot client (ancien champ « customer ») et notes internes.
 * Les notes saisies dans le back-office avant la séparation consignes / notes
 * internes sont traitées comme internes (jamais exposées par défaut).
 */
function normalizeMission(stored: StoredMission): Mission {
  const { customer, ...mission } = stored;
  const legacyNotes = mission.internalNotes === undefined;
  const backOffice = (mission.ownership?.channel ?? "BACKOFFICE") === "BACKOFFICE";
  return {
    ...mission,
    customerSnapshot: mission.customerSnapshot ?? customer ?? null,
    pricing: normalizeStoredPricing(mission.pricing),
    ownership: mission.ownership ?? { ...DEFAULT_OWNERSHIP },
    assignment: mission.assignment ?? null,
    contacts: mission.contacts ?? { pickup: null, dropoff: null },
    notes: legacyNotes && backOffice ? null : (mission.notes ?? null),
    internalNotes: legacyNotes ? (backOffice ? (mission.notes ?? null) : null) : mission.internalNotes,
  };
}

/** Lit un fichier v1 (phase 0) ou v2 et le ramène au format courant. */
function upgrade(raw: Record<string, unknown>): LocalStoreData {
  const missions = ((raw.missions as StoredMission[] | undefined) ?? []).map(normalizeMission);
  if (raw.version === 2) {
    const data = raw as unknown as LocalStoreData;
    return { ...EMPTY_STORE, ...data, missions, directory: { ...EMPTY_DIRECTORY, ...data.directory } };
  }
  return {
    ...EMPTY_STORE,
    missions,
    settings: (raw.settings as AppSettings | null | undefined) ?? null,
    demoVersion: raw.demoSeeded ? 1 : 0,
  };
}

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
      return upgrade(JSON.parse(content) as Record<string, unknown>);
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
