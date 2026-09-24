import type { Mission, MissionStatus } from "./types";

export const MISSION_FILTERS = ["ALL", "TODAY", "UPCOMING", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
export type MissionFilter = (typeof MISSION_FILTERS)[number];

export const MISSION_FILTER_LABELS: Record<MissionFilter, string> = {
  ALL: "Toutes",
  TODAY: "Aujourd'hui",
  UPCOMING: "À venir",
  IN_PROGRESS: "En cours",
  DONE: "Terminées",
  CANCELLED: "Annulées",
};

const DONE_STATUSES: readonly MissionStatus[] = ["DELIVERED", "COMPLETED"];
const CLOSED_STATUSES: readonly MissionStatus[] = [...DONE_STATUSES, "CANCELLED"];

export function matchesMissionFilter(mission: Mission, filter: MissionFilter, today: string): boolean {
  switch (filter) {
    case "ALL":
      return true;
    case "TODAY":
      return mission.scheduledDate === today && mission.status !== "CANCELLED";
    case "UPCOMING":
      return mission.scheduledDate > today && !CLOSED_STATUSES.includes(mission.status);
    case "IN_PROGRESS":
      return mission.status === "IN_PROGRESS";
    case "DONE":
      return DONE_STATUSES.includes(mission.status);
    case "CANCELLED":
      return mission.status === "CANCELLED";
  }
}

/** Tri : date/heure prévues décroissantes (les plus récentes d'abord). */
export function sortMissionsBySchedule(missions: readonly Mission[], direction: "asc" | "desc" = "desc"): Mission[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...missions].sort(
    (a, b) => factor * `${a.scheduledDate}T${a.scheduledTime}`.localeCompare(`${b.scheduledDate}T${b.scheduledTime}`),
  );
}
