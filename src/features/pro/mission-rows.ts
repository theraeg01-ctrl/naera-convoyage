import type { MissionRowData } from "@/components/mission/mission-row";
import { shortPlace } from "@/components/mission/mission-view-card";
import type { CustomerMissionView } from "@/core/access/projections";
import { vehicleDisplayName } from "@/core/mission/types";
import { formatEuro } from "@/core/shared/format";

/**
 * Rangée de mission pro : trajet, statut, véhicule et référence client,
 * date et heure, montant facturé HT. Le créateur et la référence complète
 * restent dans le détail de la mission.
 */
export function toProMissionRow(mission: CustomerMissionView): MissionRowData {
  return {
    id: mission.id,
    href: `/pro/missions/${mission.id}`,
    reference: mission.reference,
    status: mission.status,
    route: `${shortPlace(mission.pickup)} → ${shortPlace(mission.dropoff)}`,
    detail: [vehicleDisplayName(mission.vehicle), mission.customerReference].filter(Boolean).join(" · "),
    scheduledDate: mission.scheduledDate,
    scheduledTime: mission.scheduledTime,
    amount: formatEuro(mission.totals.ht),
    amountHint: "HT",
  };
}
