import { TransportIcon } from "@/components/transport/transport-icon";
import type { DriverLegView } from "@/core/access/projections";
import { formatMinutes } from "@/core/shared/format";
import { TRANSPORT_MODE_LABELS } from "@/core/transport/types";

/** Trajet du convoyeur (aller vers le véhicule, retour) : horaires et gares, jamais de prix. */
export function DriverLegCard({ title, leg }: { title: string; leg: DriverLegView }) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
        <TransportIcon mode={leg.mode} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-faint">{title}</p>
        <p className="font-semibold">{TRANSPORT_MODE_LABELS[leg.mode]}</p>
        <p className="text-sm break-words text-muted">
          {leg.fromStation && leg.toStation ? `${leg.fromStation} → ${leg.toStation} · ` : ""}
          {leg.departureTime ? `départ ${leg.departureTime} · ` : ""}
          {formatMinutes(leg.durationMin)}
        </p>
      </div>
    </div>
  );
}
