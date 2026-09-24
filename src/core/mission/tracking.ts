import type { MissionProgress, MissionStatus } from "./types";

export type TrackingStageId = "ORDERED" | "CONFIRMED" | "PICKED_UP" | "ON_THE_WAY" | "DELIVERED";

export interface TrackingStage {
  id: TrackingStageId;
  label: string;
  state: "done" | "current" | "upcoming";
  at?: string;
}

const NOT_CONFIRMED: readonly MissionStatus[] = ["DRAFT", "QUOTED", "CANCELLED"];

/** Suivi simplifié pour le client : 5 étapes compréhensibles, sans détail interne. */
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
  };
  const labels: Record<TrackingStageId, string> = {
    ORDERED: "Commande enregistrée",
    CONFIRMED: status === "QUOTED" ? "En attente de votre confirmation" : "Mission confirmée",
    PICKED_UP: "Véhicule pris en charge",
    ON_THE_WAY: "En route",
    DELIVERED: "Véhicule livré",
  };
  let currentAssigned = status === "CANCELLED";
  return (Object.keys(labels) as TrackingStageId[]).map((id) => {
    const value = done[id];
    if (value) return { id, label: labels[id], state: "done", at: typeof value === "string" ? value : undefined };
    if (!currentAssigned) {
      currentAssigned = true;
      return { id, label: labels[id], state: "current" };
    }
    return { id, label: labels[id], state: "upcoming" };
  });
}
