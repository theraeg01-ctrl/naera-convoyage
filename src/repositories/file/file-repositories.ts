import { randomUUID } from "node:crypto";
import { nextMissionReference } from "@/core/mission/reference";
import type { Mission } from "@/core/mission/types";
import type { AppSettings } from "@/core/settings/types";
import type { MissionRepository, NewMission, Repositories, SettingsRepository } from "../types";
import { LocalFileStore } from "./file-store";

class FileMissionRepository implements MissionRepository {
  constructor(private readonly store: LocalFileStore) {}

  async list(): Promise<Mission[]> {
    return (await this.store.read()).missions;
  }

  async findById(id: string): Promise<Mission | null> {
    return (await this.store.read()).missions.find((mission) => mission.id === id) ?? null;
  }

  create(input: NewMission, now: Date): Promise<Mission> {
    return this.store.update((data) => {
      const iso = now.toISOString();
      const reference = nextMissionReference(
        data.missions.map((mission) => mission.reference),
        now.getUTCFullYear(),
      );
      const mission: Mission = { ...input, id: randomUUID(), reference, createdAt: iso, updatedAt: iso };
      data.missions.push(mission);
      return mission;
    });
  }

  save(mission: Mission): Promise<Mission> {
    return this.store.update((data) => {
      const index = data.missions.findIndex((candidate) => candidate.id === mission.id);
      if (index === -1) throw new Error(`Mission introuvable : ${mission.id}`);
      data.missions[index] = mission;
      return mission;
    });
  }

  async count(): Promise<number> {
    return (await this.store.read()).missions.length;
  }
}

class FileSettingsRepository implements SettingsRepository {
  constructor(private readonly store: LocalFileStore) {}

  async get(): Promise<AppSettings | null> {
    return (await this.store.read()).settings;
  }

  save(settings: AppSettings): Promise<AppSettings> {
    return this.store.update((data) => {
      data.settings = settings;
      return settings;
    });
  }
}

export function createFileRepositories(directory: string): Repositories {
  const store = new LocalFileStore(directory);
  return {
    kind: "local-file",
    missions: new FileMissionRepository(store),
    settings: new FileSettingsRepository(store),
    demoSeeded: async () => (await store.read()).demoSeeded,
    markDemoSeeded: () =>
      store.update((data) => {
        data.demoSeeded = true;
      }),
  };
}
