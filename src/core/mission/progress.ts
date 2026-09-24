import { DomainError } from "../shared/errors";
import type { Mission, MissionProgress, MissionStatus } from "./types";

type Milestone = keyof MissionProgress;

export interface FieldStep {
  id: string;
  label: string;
  milestone: Milestone;
}

/** Étapes terrain affichées au convoyeur. Les saisies détaillées (photos, km…) arrivent en phase 5. */
export const FIELD_STEPS: readonly FieldStep[] = [
  { id: "VEHICLE_ARRIVAL", label: "Arrivée véhicule", milestone: "inspectedAt" },
  { id: "INSPECTION", label: "Inspection", milestone: "inspectedAt" },
  { id: "PHOTOS", label: "Photos", milestone: "inspectedAt" },
  { id: "START_MILEAGE", label: "Kilométrage départ", milestone: "inspectedAt" },
  { id: "DOCUMENTS", label: "Documents", milestone: "inspectedAt" },
  { id: "DEPARTURE", label: "Départ", milestone: "drivingAt" },
  { id: "DESTINATION_ARRIVAL", label: "Arrivée destination", milestone: "deliveredAt" },
  { id: "END_MILEAGE", label: "Kilométrage arrivée", milestone: "deliveredAt" },
  { id: "CUSTOMER_SIGNATURE", label: "Signature client", milestone: "deliveredAt" },
  { id: "COMPLETED", label: "Mission terminée", milestone: "completedAt" },
];

export type FieldStepState = "done" | "current" | "upcoming";

export interface FieldStepView extends FieldStep {
  state: FieldStepState;
  at?: string;
}

const ACTIVE_STATUSES: readonly MissionStatus[] = ["IN_PROGRESS", "DELIVERED"];

export function fieldStepsView(mission: Pick<Mission, "status" | "progress">): FieldStepView[] {
  let currentAssigned = !ACTIVE_STATUSES.includes(mission.status);
  return FIELD_STEPS.map((step) => {
    const at = mission.progress[step.milestone];
    if (at) return { ...step, state: "done", at };
    if (!currentAssigned) {
      currentAssigned = true;
      return { ...step, state: "current" };
    }
    return { ...step, state: "upcoming" };
  });
}

export function progressRatio(mission: Pick<Mission, "status" | "progress">): number {
  const done = fieldStepsView(mission).filter((step) => step.state === "done").length;
  return done / FIELD_STEPS.length;
}

export const MISSION_ACTIONS = [
  "CONFIRM",
  "START",
  "CONFIRM_INSPECTION",
  "START_DRIVING",
  "CONFIRM_DELIVERY",
  "COMPLETE",
  "CANCEL",
] as const;
export type MissionActionId = (typeof MISSION_ACTIONS)[number];

export interface MissionAction {
  id: MissionActionId;
  label: string;
  hint: string;
}

const ACTIONS: Record<MissionActionId, MissionAction> = {
  CONFIRM: { id: "CONFIRM", label: "Confirmer la mission", hint: "Le client a validé le tarif" },
  START: { id: "START", label: "Démarrer la mission", hint: "Le convoyeur part rejoindre le véhicule" },
  CONFIRM_INSPECTION: {
    id: "CONFIRM_INSPECTION",
    label: "Confirmer l'inspection",
    hint: "Arrivée, inspection, photos, kilométrage et documents",
  },
  START_DRIVING: { id: "START_DRIVING", label: "Démarrer le convoyage", hint: "Le véhicule quitte le point de départ" },
  CONFIRM_DELIVERY: {
    id: "CONFIRM_DELIVERY",
    label: "Confirmer la livraison",
    hint: "Arrivée, kilométrage et signature client",
  },
  COMPLETE: { id: "COMPLETE", label: "Clôturer la mission", hint: "Tout est en ordre" },
  CANCEL: { id: "CANCEL", label: "Annuler la mission", hint: "La mission n'aura pas lieu" },
};

export function missionActionDetails(id: MissionActionId): MissionAction {
  return ACTIONS[id];
}

/** Action principale proposée au convoyeur selon l'état de la mission. */
export function nextMissionAction(mission: Pick<Mission, "status" | "progress">): MissionAction | null {
  switch (mission.status) {
    case "DRAFT":
    case "QUOTED":
      return ACTIONS.CONFIRM;
    case "CONFIRMED":
    case "ASSIGNED":
      return ACTIONS.START;
    case "IN_PROGRESS":
      if (!mission.progress.inspectedAt) return ACTIONS.CONFIRM_INSPECTION;
      if (!mission.progress.drivingAt) return ACTIONS.START_DRIVING;
      return ACTIONS.CONFIRM_DELIVERY;
    case "DELIVERED":
      return ACTIONS.COMPLETE;
    case "COMPLETED":
    case "CANCELLED":
      return null;
  }
}

/** Libellé une fois l'action effectuée (historique, confirmation à l'écran). */
export const ACTION_DONE_LABELS: Record<MissionActionId, string> = {
  CONFIRM: "Mission confirmée",
  START: "Mission démarrée",
  CONFIRM_INSPECTION: "Inspection confirmée",
  START_DRIVING: "Convoyage démarré",
  CONFIRM_DELIVERY: "Livraison confirmée",
  COMPLETE: "Mission clôturée",
  CANCEL: "Mission annulée",
};

export function canCancel(status: MissionStatus): boolean {
  return status !== "COMPLETED" && status !== "CANCELLED" && status !== "DELIVERED";
}

export interface MissionTransition {
  status: MissionStatus;
  progress: MissionProgress;
  eventLabel: string;
}

/** Applique une action (fonction pure) ; refuse toute action hors séquence. */
export function applyMissionAction(
  mission: Pick<Mission, "status" | "progress">,
  actionId: MissionActionId,
  now: string,
): MissionTransition {
  if (actionId === "CANCEL") {
    if (!canCancel(mission.status)) throw new DomainError("Cette mission ne peut plus être annulée");
    return { status: "CANCELLED", progress: mission.progress, eventLabel: ACTION_DONE_LABELS.CANCEL };
  }
  const expected = nextMissionAction(mission);
  if (!expected || expected.id !== actionId) {
    throw new DomainError(`Action ${actionId} impossible pour une mission au statut ${mission.status}`);
  }
  const progress = { ...mission.progress };
  switch (actionId) {
    case "CONFIRM":
      return { status: "CONFIRMED", progress, eventLabel: ACTION_DONE_LABELS.CONFIRM };
    case "START":
      return { status: "IN_PROGRESS", progress: { ...progress, startedAt: now }, eventLabel: ACTION_DONE_LABELS.START };
    case "CONFIRM_INSPECTION":
      return {
        status: "IN_PROGRESS",
        progress: { ...progress, inspectedAt: now },
        eventLabel: ACTION_DONE_LABELS.CONFIRM_INSPECTION,
      };
    case "START_DRIVING":
      return {
        status: "IN_PROGRESS",
        progress: { ...progress, drivingAt: now },
        eventLabel: ACTION_DONE_LABELS.START_DRIVING,
      };
    case "CONFIRM_DELIVERY":
      return {
        status: "DELIVERED",
        progress: { ...progress, deliveredAt: now },
        eventLabel: ACTION_DONE_LABELS.CONFIRM_DELIVERY,
      };
    case "COMPLETE":
      return {
        status: "COMPLETED",
        progress: { ...progress, completedAt: now },
        eventLabel: ACTION_DONE_LABELS.COMPLETE,
      };
  }
}
