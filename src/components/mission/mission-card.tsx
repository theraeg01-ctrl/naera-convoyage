import Link from "next/link";
import { LinkChevron } from "@/components/ui/link-pending";
import { customerDisplayName, placeShortName, type Mission } from "@/core/mission/types";
import { formatEuro } from "@/core/shared/format";
import { formatMissionDay } from "@/utils/dates";
import { cn } from "@/utils/cn";
import { StatusBadge } from "./status-badge";

/** Carte mission mobile : référence, client, trajet, date/heure, statut, prix. */
export function MissionCard({
  mission,
  today,
  href = `/admin/missions/${mission.id}`,
  className,
}: {
  mission: Mission;
  today: string;
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-w-0 items-center gap-3 rounded-3xl border border-border bg-surface p-4 shadow-card transition-[border-color,transform] duration-150 hover:border-border-strong active:scale-[0.99]",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-faint">{mission.reference}</span>
          {mission.isDemo ? <span className="text-[11px] font-medium text-faint">· démo</span> : null}
        </div>
        <p className="truncate text-[17px] font-semibold tracking-tight">
          {placeShortName(mission.pickup)} <span className="text-faint">→</span> {placeShortName(mission.dropoff)}
        </p>
        <p className="truncate text-sm text-muted">{customerDisplayName(mission.customerSnapshot)}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
          <StatusBadge status={mission.status} />
          <span className="text-sm text-muted tabular">
            {formatMissionDay(mission.scheduledDate, today)} · {mission.scheduledTime}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <div className="text-right">
          <p className="text-[17px] font-semibold">{formatEuro(mission.pricing.totals.ht)}</p>
          <p className="text-xs text-faint">HT</p>
        </div>
        <LinkChevron />
      </div>
    </Link>
  );
}
