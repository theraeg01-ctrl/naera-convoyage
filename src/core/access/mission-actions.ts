import { canCancel, nextMissionAction, type MissionActionId } from "../mission/progress";
import type { Mission } from "../mission/types";
import type { Actor } from "./actor";
import { can } from "./permissions";

/** Étapes terrain que le convoyeur affecté peut valider lui-même. */
const DRIVER_ACTIONS: readonly MissionActionId[] = ["START", "CONFIRM_INSPECTION", "START_DRIVING", "CONFIRM_DELIVERY"];

/**
 * Actions autorisées pour un acteur sur une mission (déjà chargée dans son
 * périmètre). Naera pilote tout ; le convoyeur fait avancer le terrain ;
 * le client accepte un devis.
 */
export function allowedMissionActions(actor: Actor, mission: Pick<Mission, "status" | "progress">): MissionActionId[] {
  const next = nextMissionAction(mission)?.id ?? null;
  if (can(actor, "missions.manage")) {
    return [...(next ? [next] : []), ...(canCancel(mission.status) ? (["CANCEL"] as const) : [])];
  }
  if (actor.kind === "DRIVER" && can(actor, "missions.progress")) {
    return next && DRIVER_ACTIONS.includes(next) ? [next] : [];
  }
  if ((actor.kind === "BUSINESS" || actor.kind === "PERSONAL") && can(actor, "missions.create")) {
    return mission.status === "QUOTED" ? ["CONFIRM"] : [];
  }
  return [];
}

export function canPerformMissionAction(
  actor: Actor,
  mission: Pick<Mission, "status" | "progress">,
  action: MissionActionId,
): boolean {
  return allowedMissionActions(actor, mission).includes(action);
}
