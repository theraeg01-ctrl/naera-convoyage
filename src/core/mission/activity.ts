import type { CustomerMissionView } from "../access/projections";

/** Événement récent d'une mission, tel que le client peut le voir. */
export interface ActivityItem {
  id: string;
  missionId: string;
  reference: string;
  route: string;
  label: string;
  at: string;
}

/**
 * Fil d'activité récente d'un compte client : événements des missions
 * (libellés déjà filtrés par la vue client), du plus récent au plus ancien.
 */
export function recentActivity(missions: readonly CustomerMissionView[], now: Date, limit = 6): ActivityItem[] {
  const cutoff = now.toISOString();
  return missions
    .flatMap((mission) =>
      mission.events.map((event) => ({
        id: event.id,
        missionId: mission.id,
        reference: mission.reference,
        route: `${mission.pickup.city ?? mission.pickup.label} → ${mission.dropoff.city ?? mission.dropoff.label}`,
        label: event.label,
        at: event.at,
      })),
    )
    .filter((item) => item.at <= cutoff)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}
