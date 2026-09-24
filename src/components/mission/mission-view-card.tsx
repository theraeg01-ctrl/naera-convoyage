import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { MissionStatus } from "@/core/mission/types";
import { formatMissionDay } from "@/utils/dates";
import { cn } from "@/utils/cn";
import { StatusBadge } from "./status-badge";

interface MissionViewCardProps {
  href: string;
  reference: string;
  isDemo: boolean;
  status: MissionStatus;
  from: string;
  to: string;
  subtitle?: ReactNode;
  scheduledDate: string;
  scheduledTime: string;
  today: string;
  /** Montant affiché à droite (prix client) — absent pour le convoyeur. */
  amount?: ReactNode;
  amountHint?: string;
  className?: string;
}

/** Carte mission pour les portails (vues projetées : aucune donnée interne). */
export function MissionViewCard(props: MissionViewCardProps) {
  return (
    <Link
      href={props.href}
      className={cn(
        "group flex min-w-0 items-center gap-3 rounded-3xl border border-border bg-surface p-4 shadow-card transition-[border-color,transform] duration-150 hover:border-border-strong active:scale-[0.99]",
        props.className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-faint">{props.reference}</span>
          {props.isDemo ? <span className="text-[11px] font-medium text-faint">· démo</span> : null}
        </div>
        <p className="truncate text-[17px] font-semibold tracking-tight">
          {props.from} <span className="text-faint">→</span> {props.to}
        </p>
        {props.subtitle ? <p className="truncate text-sm text-muted">{props.subtitle}</p> : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
          <StatusBadge status={props.status} />
          <span className="text-sm text-muted tabular">
            {formatMissionDay(props.scheduledDate, props.today)} · {props.scheduledTime}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {props.amount !== undefined ? (
          <div className="text-right">
            <p className="text-[17px] font-semibold">{props.amount}</p>
            {props.amountHint ? <p className="text-xs text-faint">{props.amountHint}</p> : null}
          </div>
        ) : null}
        <ChevronRight className="size-5 text-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>
    </Link>
  );
}

/** Nom court d'un lieu projeté. */
export function shortPlace(place: { label: string; city: string | null }): string {
  return place.city ?? place.label;
}
