import type { MissionProgress, MissionStatus } from "./types";

/**
 * Suivi client : 6 étapes compréhensibles, identiques sur tous les portails.
 *
 * - Commande enregistrée     : la demande existe (création).
 * - Mission confirmée        : le client a validé le tarif (statut CONFIRMED ou suivant).
 * - Véhicule pris en charge  : le convoyeur a inspecté le véhicule au départ (inspectedAt).
 * - En route                 : le véhicule a quitté le point de départ (drivingAt).
 * - Véhicule livré           : REMISE PHYSIQUE réalisée au destinataire — arrivée, kilométrage
 *                              d'arrivée, remise des clés (deliveredAt, statut DELIVERED).
 *                              Validée par le convoyeur.
 * - Mission terminée         : FORMALITÉS FINALISÉES — PV de livraison signé, photos et
 *                              documents rattachés, frais justifiés (completedAt, statut
 *                              COMPLETED). Clôturée par Naera ; la mission devient facturable.
 *
 * Un véhicule livré n'est donc pas encore une mission terminée.
 */
export type TrackingStageId = "ORDERED" | "CONFIRMED" | "PICKED_UP" | "ON_THE_WAY" | "DELIVERED" | "COMPLETED";

export interface TrackingStage {
  id: TrackingStageId;
  label: string;
  hint?: string;
  state: "done" | "current" | "upcoming";
  at?: string;
}

const NOT_CONFIRMED: readonly MissionStatus[] = ["DRAFT", "QUOTED", "CANCELLED"];

export const TRACKING_STAGE_LABELS: Record<TrackingStageId, string> = {
  ORDERED: "Commande enregistrée",
  CONFIRMED: "Mission confirmée",
  PICKED_UP: "Véhicule pris en charge",
  ON_THE_WAY: "En route",
  DELIVERED: "Véhicule livré",
  COMPLETED: "Mission terminée",
};

/** Précision affichée sous les deux étapes finales, pour ne jamais confondre livré et terminé. */
export const TRACKING_STAGE_HINTS: Partial<Record<TrackingStageId, string>> = {
  DELIVERED: "Véhicule et clés remis au destinataire",
  COMPLETED: "PV signé, documents et frais finalisés",
};

export function customerTracking(input: {
  status: MissionStatus;
  progress: MissionProgress;
  createdAt: string;
}): TrackingStage[] {
  const { status, progress } = input;
  const done: Record<TrackingStageId, string | boolean | undefined> = {
    ORDERED: input.createdAt,
    CONFIRMED: !NOT_CONFIRMED.includes(status),
    PICKED_UP: progress.inspectedAt,
    ON_THE_WAY: progress.drivingAt,
    DELIVERED: progress.deliveredAt,
    COMPLETED: progress.completedAt,
  };
  const labels: Record<TrackingStageId, string> = {
    ...TRACKING_STAGE_LABELS,
    CONFIRMED: status === "QUOTED" ? "En attente de votre confirmation" : TRACKING_STAGE_LABELS.CONFIRMED,
  };
  let currentAssigned = status === "CANCELLED";
  return (Object.keys(labels) as TrackingStageId[]).map((id) => {
    const value = done[id];
    const base = { id, label: labels[id], ...(TRACKING_STAGE_HINTS[id] ? { hint: TRACKING_STAGE_HINTS[id] } : {}) };
    if (value) return { ...base, state: "done", at: typeof value === "string" ? value : undefined };
    if (!currentAssigned) {
      currentAssigned = true;
      return { ...base, state: "current" };
    }
    return { ...base, state: "upcoming" };
  });
}
