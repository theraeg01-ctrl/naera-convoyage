import { randomUUID } from "node:crypto";
import { applyMissionAction, type MissionActionId } from "@/core/mission/progress";
import type { Mission, MissionEvent, MissionProgress, MissionStatus } from "@/core/mission/types";
import { DomainError } from "@/core/shared/errors";
import { resolveSimulation } from "@/core/simulation/resolve";
import type { MissionRequest, SimulationResult, SimulationSelections } from "@/core/simulation/types";
import type { Repositories } from "@/repositories/types";
import { logTechnicalError } from "../logger";
import { getSettings } from "../settings/settings-service";
import type { SimulationService } from "../simulation/simulation-service";
import { buildDemoMissions } from "../demo/demo-missions";
import { saveMissionInputSchema, type SaveMissionInput } from "./schemas";

export type { SaveMissionInput };

export type MissionErrorCode = "INVALID_INPUT" | "ROUTE_REQUIRED" | "NOT_FOUND" | "INVALID_ACTION";

/** Erreur métier avec un message affichable tel quel. */
export class MissionServiceError extends Error {
  constructor(
    readonly code: MissionErrorCode,
    readonly userMessage: string,
  ) {
    super(userMessage);
    this.name = "MissionServiceError";
  }
}

interface CreateOptions {
  status?: MissionStatus;
  isDemo?: boolean;
  progress?: MissionProgress;
  now?: Date;
}

function event(type: MissionEvent["type"], label: string, at: string): MissionEvent {
  return { id: randomUUID(), type, label, at };
}

const globalForDemo = globalThis as unknown as { naeraDemoSeeding?: Promise<void> };

/**
 * MissionService : création (recalcul serveur du tarif), consultation,
 * progression terrain. Aucune logique d'interface ici.
 */
export class MissionService {
  constructor(
    private readonly repositories: Repositories,
    private readonly demoSimulation: SimulationService,
  ) {}

  get storageKind() {
    return this.repositories.kind;
  }

  /** L'entrée est validée ici (Zod) : elle peut provenir du navigateur ou de l'API. */
  async createFromSimulation(input: unknown, options: CreateOptions = {}): Promise<Mission> {
    const parsed = saveMissionInputSchema.safeParse(input);
    if (!parsed.success) {
      logTechnicalError("Mission invalide", parsed.error);
      throw new MissionServiceError("INVALID_INPUT", "Certaines informations sont invalides. Vérifie la saisie.");
    }
    const { simulation, selections, customer, vehicle, notes } = parsed.data;
    const settings = await getSettings();
    const resolved = resolveSimulation(simulation as SimulationResult, selections as SimulationSelections, settings);
    if (!resolved) {
      throw new MissionServiceError(
        "ROUTE_REQUIRED",
        "Indique la distance et la durée du trajet pour enregistrer la mission.",
      );
    }
    const now = options.now ?? new Date();
    const nowIso = now.toISOString();
    const request = simulation.request as MissionRequest;
    const selectedReturn = resolved.return.selected;
    const returnAlternatives = resolved.return.ranked.map(({ option }) =>
      selectedReturn && option.id === selectedReturn.id ? selectedReturn : option,
    );

    return this.repositories.missions.create(
      {
        status: options.status ?? "DRAFT",
        isDemo: options.isDemo ?? false,
        scheduledDate: request.date,
        scheduledTime: request.time,
        pickup: simulation.pickup,
        dropoff: simulation.dropoff,
        customer,
        vehicle: { ...request.vehicle, ...vehicle },
        request,
        strategy: selections.strategy,
        route: resolved.route,
        accessLeg: resolved.access.selected,
        returnLeg: selectedReturn,
        returnAlternatives,
        pricing: resolved.pricing,
        dataMode: simulation.dataMode,
        progress: options.progress ?? {},
        events: [event("CREATED", "Mission créée", nowIso)],
        notes: notes ?? null,
      },
      now,
    );
  }

  async list(): Promise<Mission[]> {
    await this.ensureDemoData();
    return this.repositories.missions.list();
  }

  async get(id: string): Promise<Mission | null> {
    await this.ensureDemoData();
    return this.repositories.missions.findById(id);
  }

  async applyAction(id: string, actionId: MissionActionId, now: Date = new Date()): Promise<Mission> {
    const mission = await this.repositories.missions.findById(id);
    if (!mission) throw new MissionServiceError("NOT_FOUND", "Cette mission n'existe plus.");
    const nowIso = now.toISOString();
    try {
      const transition = applyMissionAction(mission, actionId, nowIso);
      const type = transition.status !== mission.status ? "STATUS_CHANGED" : "CHECKPOINT";
      return await this.repositories.missions.save({
        ...mission,
        status: transition.status,
        progress: transition.progress,
        events: [...mission.events, event(type, transition.eventLabel, nowIso)],
        updatedAt: nowIso,
      });
    } catch (error) {
      if (error instanceof DomainError) {
        throw new MissionServiceError("INVALID_ACTION", "Cette action n'est plus possible. Actualise la mission.");
      }
      throw error;
    }
  }

  /** Stockage local uniquement : injecte une fois les missions de démonstration. */
  private ensureDemoData(): Promise<void> {
    globalForDemo.naeraDemoSeeding ??= this.seedDemo().catch((error) => {
      logTechnicalError("Injection des données de démonstration", error);
      globalForDemo.naeraDemoSeeding = undefined;
    });
    return globalForDemo.naeraDemoSeeding;
  }

  async seedDemo(now: Date = new Date()): Promise<void> {
    if (await this.repositories.demoSeeded()) return;
    if ((await this.repositories.missions.count()) > 0) {
      await this.repositories.markDemoSeeded();
      return;
    }
    const settings = await getSettings();
    for (const demo of buildDemoMissions(now)) {
      const simulation = await this.demoSimulation.run(demo.request, settings, now);
      await this.createFromSimulation(
        {
          simulation,
          selections: {
            routeKind: "FASTEST",
            strategy: demo.request.strategy,
            accessOptionId: null,
            returnOptionId: null,
            overrides: {},
          },
          customer: demo.customer,
          vehicle: demo.vehicle,
          notes: demo.notes,
        },
        { status: demo.status, isDemo: true, progress: demo.progress, now },
      );
    }
    await this.repositories.markDemoSeeded();
  }
}
