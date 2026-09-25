import { ArrowRight, Sparkles } from "lucide-react";
import { formatEuro, formatMinutes } from "@/core/shared/format";
import { TRANSPORT_MODE_LABELS, type TransportOption } from "@/core/transport/types";
import { Badge, DataSourceBadge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import { TransportIcon } from "./transport-icon";

function connectionsLabel(option: TransportOption): string | null {
  if (option.mode !== "TRAIN" && option.mode !== "PUBLIC_TRANSIT") return null;
  if (option.connections === 0) return "Direct";
  return option.connections === 1 ? "1 correspondance" : `${option.connections} correspondances`;
}

interface RecommendedProps {
  option: TransportOption;
  reason?: string;
  isRecommended?: boolean;
  className?: string;
}

/** Carte mise en avant : solution retenue pour le trajet du convoyeur. */
export function RecommendedTransportCard({ option, reason, isRecommended = true, className }: RecommendedProps) {
  const connections = connectionsLabel(option);
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-5 shadow-card", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <TransportIcon mode={option.mode} className="size-6" />
          </span>
          <div>
            <p className="text-[13px] font-semibold tracking-[0.08em] text-faint uppercase">
              {TRANSPORT_MODE_LABELS[option.mode]}
            </p>
            <p className="text-3xl font-bold tracking-tight">{formatEuro(option.price)}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {isRecommended ? (
            <Badge tone="success" size="md">
              <Sparkles aria-hidden />
              Recommandé
            </Badge>
          ) : (
            <Badge tone="outline" size="md">
              Choix manuel
            </Badge>
          )}
          <DataSourceBadge source={option.source} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]">
        <span className="font-semibold tabular">{formatMinutes(option.durationMin)}</span>
        {connections ? <span className="text-muted">· {connections}</span> : null}
        {option.departureTime && option.arrivalTime ? (
          <span className="inline-flex items-center gap-1 text-muted tabular">
            · {option.departureTime} <ArrowRight className="size-3.5" aria-label="arrivée" /> {option.arrivalTime}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted">{option.detail}</p>
      {reason ? <p className="mt-3 text-sm font-medium text-success">{reason}</p> : null}
    </div>
  );
}

interface OptionRowProps {
  option: TransportOption;
  selected: boolean;
  deltaVsSelected?: number;
  name: string;
  onSelect?: () => void;
  score?: number;
}

/** Alternative sélectionnable (bouton radio), lisible au pouce. Sans onSelect : affichage seul. */
export function TransportOptionRow({ option, selected, deltaVsSelected, name, onSelect, score }: OptionRowProps) {
  const connections = connectionsLabel(option);
  const interactive = onSelect !== undefined;
  const content = (
    <>
      {interactive ? (
        <input type="radio" name={name} checked={selected} onChange={onSelect} className="sr-only" />
      ) : null}
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
        <TransportIcon mode={option.mode} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold">{TRANSPORT_MODE_LABELS[option.mode]}</span>
          <DataSourceBadge source={option.source} />
        </span>
        <span className="block truncate text-sm text-muted tabular">
          {formatMinutes(option.durationMin)}
          {connections ? ` · ${connections}` : ""}
          {score !== undefined ? ` · score ${score}` : ""}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-semibold tabular">{formatEuro(option.price)}</span>
        {deltaVsSelected !== undefined && deltaVsSelected !== 0 ? (
          <span className={cn("block text-xs tabular", deltaVsSelected > 0 ? "text-faint" : "text-success")}>
            {deltaVsSelected > 0 ? "+" : "−"}
            {formatEuro(Math.abs(Math.round(deltaVsSelected)))}
          </span>
        ) : null}
      </span>
    </>
  );
  const className = cn(
    "flex items-center gap-3 rounded-2xl border bg-surface p-3.5 transition-colors",
    selected ? "border-accent ring-2 ring-accent-soft" : "border-border",
  );
  if (!interactive) return <div className={className}>{content}</div>;
  return (
    <label
      className={cn(
        className,
        "cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-accent",
        !selected && "hover:border-border-strong",
      )}
    >
      {content}
    </label>
  );
}
