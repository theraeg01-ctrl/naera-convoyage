import Link from "next/link";
import type { ReactNode } from "react";
import { LinkChevron } from "@/components/ui/link-pending";
import type { MissionStatus } from "@/core/mission/types";
import { formatMissionDay } from "@/utils/dates";
import { cn } from "@/utils/cn";
import { StatusBadge } from "./status-badge";

export interface MissionRowData {
  id: string;
  href: string;
  reference: string;
  status: MissionStatus;
  route: string;
  /** Véhicule, référence client… (tronqué proprement). */
  detail?: string;
  scheduledDate: string;
  scheduledTime: string;
  amount?: ReactNode;
  amountHint?: string;
}

/** Numéro court lisible sur mobile : « N° 0026 » (référence complète au survol et dans le détail). */
export function shortReference(reference: string): string {
  const last = reference.split("-").pop();
  return last ? `N° ${last}` : reference;
}

/**
 * Rangée de mission compacte. Ordre de lecture : trajet, statut, véhicule /
 * référence, date et heure, montant. Les informations secondaires restent
 * dans le détail.
 */
export function MissionRow({ mission, today }: { mission: MissionRowData; today: string }) {
  return (
    <Link
      href={mission.href}
      className="group flex items-center gap-2 px-4 py-3.5 transition-colors hover:bg-surface-2/60 sm:px-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate text-[16px] font-semibold tracking-tight">{mission.route}</p>
          <StatusBadge status={mission.status} />
        </div>
        {mission.detail ? <p className="mt-0.5 truncate text-sm text-muted">{mission.detail}</p> : null}
        <div className="mt-1.5 flex items-baseline justify-between gap-3 text-sm">
          <p className="min-w-0 truncate text-muted tabular">
            {formatMissionDay(mission.scheduledDate, today)} · {mission.scheduledTime}
            <span className="ml-2 font-mono text-xs text-faint" title={mission.reference}>
              {shortReference(mission.reference)}
            </span>
          </p>
          {mission.amount !== undefined ? (
            <p className="shrink-0 font-semibold tabular">
              {mission.amount}
              {mission.amountHint ? (
                <span className="ml-1 text-xs font-medium text-faint">{mission.amountHint}</span>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
      <LinkChevron className="size-4" />
    </Link>
  );
}

/** Liste de missions dans un seul bloc, séparateurs fins. */
export function MissionRowList({
  missions,
  today,
  className,
}: {
  missions: MissionRowData[];
  today: string;
  className?: string;
}) {
  return (
    <div
      className={cn("divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface", className)}
    >
      {missions.map((mission) => (
        <MissionRow key={mission.id} mission={mission} today={today} />
      ))}
    </div>
  );
}
