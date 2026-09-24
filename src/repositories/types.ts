import type { Mission } from "@/core/mission/types";
import type { AppSettings } from "@/core/settings/types";

/** Mission prête à être enregistrée : l'identifiant et la référence sont attribués par le dépôt. */
export type NewMission = Omit<Mission, "id" | "reference" | "createdAt" | "updatedAt">;

export interface MissionRepository {
  list(): Promise<Mission[]>;
  findById(id: string): Promise<Mission | null>;
  /** Attribue la prochaine référence NAE-CV-AAAA-NNNN de façon atomique. */
  create(mission: NewMission, now: Date): Promise<Mission>;
  save(mission: Mission): Promise<Mission>;
  count(): Promise<number>;
}

export interface SettingsRepository {
  get(): Promise<AppSettings | null>;
  save(settings: AppSettings): Promise<AppSettings>;
}

export type StorageKind = "postgres" | "local-file";

export interface Repositories {
  kind: StorageKind;
  missions: MissionRepository;
  settings: SettingsRepository;
  /** Stockage local uniquement : données de démonstration déjà injectées ? */
  demoSeeded(): Promise<boolean>;
  markDemoSeeded(): Promise<void>;
}
