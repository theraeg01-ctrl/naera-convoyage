import { randomUUID } from "node:crypto";
import { personName, type DriverProfile } from "@/core/accounts/types";
import type { MissionScope } from "@/core/access/scope";
import { applyMissionAction, type MissionActionId } from "@/core/mission/progress";
import {
  DEFAULT_OWNERSHIP,
  type ContactPerson,
  type CustomerInfo,
  type Mission,
  type MissionAssignment,
  type MissionEvent,
  type MissionOwnership,
  type MissionProgress,
  type MissionStatus,
  type VehicleInfo,
} from "@/core/mission/types";
import { DomainError } from "@/core/shared/errors";
import { defaultSelections, resolveSimulation, type ResolvedSimulation } from "@/core/simulation/resolve";
import type { MissionRequest, SimulationResult, SimulationSelections } from "@/core/simulation/types";
import type { Repositories } from "@/repositories/types";
import { logTechnicalError } from "../logger";
import { getSettings } from "../settings/settings-service";
import type { SimulationService } from "../simulation/simulation-service";
import { saveMissionInputSchema, type SaveMissionInput } from "./schemas";

export type { SaveMissionInput };

export type MissionErrorCode = "INVALID_INPUT" | "ROUTE_REQUIRED" | "NOT_FOUND" | "INVALID_ACTION" | "FORBIDDEN";

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

export interface CreateOptions {
  status?: MissionStatus;
  isDemo?: boolean;
  progress?: MissionProgress;
  now?: Date;
  /** Rattachement : toujours déterminé par le serveur (acteur), jamais par la saisie. */
  ownership?: MissionOwnership;
  assignment?: MissionAssignment | null;
  /** Libellé de l'événement de création. */
  createdLabel?: string;
  extraEvents?: Omit<MissionEvent, "id">[];
}

/** Informations descriptives d'une commande (hors tarif). */
export interface OrderDetails {
  customer: CustomerInfo | null;
  vehicle: Pick<VehicleInfo, "make" | "model" | "plate">;
  contacts?: { pickup: ContactPerson | null; dropoff: ContactPerson | null };
  notes?: string | null;
}

/** Devis calculé entièrement côté serveur. */
export interface ServerQuote {
  simulation: SimulationResult;
  resolved: ResolvedSimulation;
}

const ROUTE_REQUIRED_MESSAGE = "Indique la distance et la durée du trajet pour enregistrer la mission.";

function event(type: MissionEvent["type"], label: string, at: string): MissionEvent {
  return { id: randomUUID(), type, label, at };
}

/** L'affectation n'est possible qu'avant le départ. */
const ASSIGNABLE_STATUSES: readonly MissionStatus[] = ["CONFIRMED", "ASSIGNED"];

/**
 * MissionService : création (tarif toujours recalculé côté serveur),
 * consultation dans un périmètre, progression terrain, affectation.
 * Service de confiance : l'autorisation (qui peut faire quoi) est vérifiée
 * en amont par les services de portail ; l'isolation des données est
 * appliquée ici via le périmètre transmis aux dépôts.
 */
export class MissionService {
  constructor(
    private readonly repositories: Repositories,
    private readonly simulationService: SimulationService,
  ) {}

  get storageKind() {
    return this.repositories.kind;
  }

  /**
   * Back-office : l'entrée (simulation + corrections manuelles) est validée
   * (Zod) puis le tarif est recalculé avec les paramètres du serveur.
   */
  async createFromSimulation(input: unknown, options: CreateOptions = {}): Promise<Mission> {
    const parsed = saveMissionInputSchema.safeParse(input);
    if (!parsed.success) {
      logTechnicalError("Mission invalide", parsed.error);
      throw new MissionServiceError("INVALID_INPUT", "Certaines informations sont invalides. Vérifie la saisie.");
    }
    const { simulation, selections, customer, vehicle, notes } = parsed.data;
    const settings = await getSettings();
    const resolved = resolveSimulation(simulation as SimulationResult, selections as SimulationSelections, settings);
    if (!resolved) throw new MissionServiceError("ROUTE_REQUIRED", ROUTE_REQUIRED_MESSAGE);
    return this.persist(simulation as SimulationResult, selections as SimulationSelections, resolved, {
      details: { customer, vehicle, notes },
      options,
    });
  }

  /**
   * Portails clients : la simulation est exécutée par le serveur à partir de
   * la demande ; aucune donnée tarifaire ne provient du navigateur.
   */
  async quote(request: MissionRequest, now: Date = new Date()): Promise<ServerQuote> {
    const settings = await getSettings();
    const simulation = await this.simulationService.run(request, settings, now);
    const resolved = resolveSimulation(simulation, defaultSelections(simulation), settings);
    if (!resolved) {
      throw new MissionServiceError(
        "ROUTE_REQUIRED",
        "Nous ne pouvons pas calculer ce trajet automatiquement. Vérifie les adresses ou contacte Naera.",
      );
    }
    return { simulation, resolved };
  }

  async createFromRequest(
    request: MissionRequest,
    details: OrderDetails,
    options: CreateOptions = {},
  ): Promise<Mission> {
    const { simulation, resolved } = await this.quote(request, options.now);
    return this.persist(simulation, defaultSelections(simulation), resolved, { details, options });
  }

  private persist(
    simulation: SimulationResult,
    selections: SimulationSelections,
    resolved: ResolvedSimulation,
    { details, options }: { details: OrderDetails; options: CreateOptions },
  ): Promise<Mission> {
    const now = options.now ?? new Date();
    const nowIso = now.toISOString();
    const request = simulation.request;
    const selectedReturn = resolved.return.selected;
    const returnAlternatives = resolved.return.ranked.map(({ option }) =>
      selectedReturn && option.id === selectedReturn.id ? selectedReturn : option,
    );
    const events = [
      event("CREATED", options.createdLabel ?? "Mission créée", nowIso),
      ...(options.extraEvents ?? []).map((extra) => ({ ...extra, id: randomUUID() })),
    ];

    return this.repositories.missions.create(
      {
        status: options.status ?? "DRAFT",
        isDemo: options.isDemo ?? false,
        scheduledDate: request.date,
        scheduledTime: request.time,
        pickup: simulation.pickup,
        dropoff: simulation.dropoff,
        customer: details.customer,
        ownership: options.ownership ?? { ...DEFAULT_OWNERSHIP },
        assignment: options.assignment ?? null,
        contacts: details.contacts ?? { pickup: null, dropoff: null },
        vehicle: { ...request.vehicle, ...details.vehicle },
        request,
        strategy: selections.strategy,
        route: resolved.route,
        accessLeg: resolved.access.selected,
        returnLeg: selectedReturn,
        returnAlternatives,
        pricing: resolved.pricing,
        dataMode: simulation.dataMode,
        progress: options.progress ?? {},
        events,
        notes: details.notes ?? null,
      },
      now,
    );
  }

  list(scope: MissionScope): Promise<Mission[]> {
    return this.repositories.missions.list(scope);
  }

  get(id: string, scope: MissionScope): Promise<Mission | null> {
    return this.repositories.missions.findById(id, scope);
  }

  /**
   * Fait avancer une mission du périmètre. `authorize` est évalué sur la
   * mission fraîchement chargée (aucune décision sur un état périmé).
   */
  async applyAction(
    id: string,
    actionId: MissionActionId,
    scope: MissionScope,
    authorize: (mission: Mission) => boolean = () => true,
    now: Date = new Date(),
  ): Promise<Mission> {
    const mission = await this.repositories.missions.findById(id, scope);
    if (!mission) throw new MissionServiceError("NOT_FOUND", "Cette mission n'existe plus.");
    if (!authorize(mission)) {
      throw new MissionServiceError("FORBIDDEN", "Cette action n'est pas disponible pour cette mission.");
    }
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

  /** Affectation d'un convoyeur (pilotage Naera). */
  async assignDriver(id: string, driver: DriverProfile, now: Date = new Date()): Promise<Mission> {
    const mission = await this.repositories.missions.findById(id, { kind: "ALL" });
    if (!mission) throw new MissionServiceError("NOT_FOUND", "Cette mission n'existe plus.");
    if (!ASSIGNABLE_STATUSES.includes(mission.status)) {
      throw new MissionServiceError(
        "INVALID_ACTION",
        "Un convoyeur ne peut être affecté qu'à une mission confirmée, avant son départ.",
      );
    }
    if (driver.status !== "ACTIVE") {
      throw new MissionServiceError("INVALID_INPUT", "Ce convoyeur n'est pas disponible.");
    }
    const nowIso = now.toISOString();
    const name = personName(driver);
    return this.repositories.missions.save({
      ...mission,
      status: "ASSIGNED",
      assignment: { driverProfileId: driver.id, driverName: name, status: "PROPOSED", assignedAt: nowIso },
      events: [...mission.events, event("STATUS_CHANGED", `Convoyeur affecté : ${name}`, nowIso)],
      updatedAt: nowIso,
    });
  }
}
