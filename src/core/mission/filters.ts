import type { Mission, MissionStatus } from "./types";

export const MISSION_FILTERS = ["ALL", "TODAY", "UPCOMING", "IN_PROGRESS", "TO_CONFIRM", "DONE", "CANCELLED"] as const;
export type MissionFilter = (typeof MISSION_FILTERS)[number];

export const MISSION_FILTER_LABELS: Record<MissionFilter, string> = {
  ALL: "Toutes",
  TODAY: "Aujourd'hui",
  UPCOMING: "À venir",
  IN_PROGRESS: "En cours",
  TO_CONFIRM: "À confirmer",
  DONE: "Terminées",
  CANCELLED: "Annulées",
};

/** Segments d'URL (?filtre=…) partagés par les listes de tous les portails. */
export const MISSION_FILTER_SLUGS: Record<MissionFilter, string> = {
  ALL: "toutes",
  TODAY: "aujourdhui",
  UPCOMING: "a-venir",
  IN_PROGRESS: "en-cours",
  TO_CONFIRM: "a-confirmer",
  DONE: "terminees",
  CANCELLED: "annulees",
};

export function missionFilterFromSlug(slug: string | string[] | undefined): MissionFilter {
  const value = Array.isArray(slug) ? slug[0] : slug;
  return MISSION_FILTERS.find((filter) => MISSION_FILTER_SLUGS[filter] === value) ?? "ALL";
}

const DONE_STATUSES: readonly MissionStatus[] = ["DELIVERED", "COMPLETED"];
const CLOSED_STATUSES: readonly MissionStatus[] = [...DONE_STATUSES, "CANCELLED"];

/** Fonctionne sur une mission complète comme sur une vue client ou convoyeur. */
export function matchesMissionFilter(
  mission: Pick<Mission, "scheduledDate" | "status">,
  filter: MissionFilter,
  today: string,
): boolean {
  switch (filter) {
    case "ALL":
      return true;
    case "TODAY":
      return mission.scheduledDate === today && mission.status !== "CANCELLED";
    case "UPCOMING":
      return mission.scheduledDate > today && !CLOSED_STATUSES.includes(mission.status);
    case "IN_PROGRESS":
      return mission.status === "IN_PROGRESS";
    case "TO_CONFIRM":
      return mission.status === "QUOTED";
    case "DONE":
      return DONE_STATUSES.includes(mission.status);
    case "CANCELLED":
      return mission.status === "CANCELLED";
  }
}

/** Tri : date/heure prévues décroissantes (les plus récentes d'abord). */
export function sortMissionsBySchedule<T extends Pick<Mission, "scheduledDate" | "scheduledTime">>(
  missions: readonly T[],
  direction: "asc" | "desc" = "desc",
): T[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...missions].sort(
    (a, b) => factor * `${a.scheduledDate}T${a.scheduledTime}`.localeCompare(`${b.scheduledDate}T${b.scheduledTime}`),
  );
}

/** Recherche plein texte tolérante (casse, accents, espaces). */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesSearch(fields: readonly (string | null | undefined)[], query: string): boolean {
  const needle = normalizeSearch(query);
  if (!needle) return true;
  return normalizeSearch(fields.filter(Boolean).join(" ")).includes(needle);
}
