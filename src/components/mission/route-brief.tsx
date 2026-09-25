import { MapPin, Navigation } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatKm, formatMinutes } from "@/core/shared/format";

interface RouteBriefProps {
  pickup: { label: string; city: string | null };
  dropoff: { label: string; city: string | null };
  distanceKm: number;
  durationMin: number;
  children?: React.ReactNode;
}

/** Itinéraire d'une vue projetée : adresses, distance, durée estimée. */
export function RouteBrief({ pickup, dropoff, distanceKm, durationMin, children }: RouteBriefProps) {
  return (
    <Card className="space-y-4 p-5">
      <ol className="space-y-3">
        <li className="flex gap-3">
          <Navigation className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold">{pickup.city ?? "Départ"}</p>
            <p className="text-sm break-words text-muted">{pickup.label}</p>
          </div>
        </li>
        <li className="flex gap-3">
          <MapPin className="mt-0.5 size-5 shrink-0 text-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold">{dropoff.city ?? "Arrivée"}</p>
            <p className="text-sm break-words text-muted">{dropoff.label}</p>
          </div>
        </li>
      </ol>
      <p className="border-t border-border pt-3 text-[15px] font-medium tabular">
        {formatKm(distanceKm)} · {formatMinutes(durationMin)} de route
      </p>
      {children}
    </Card>
  );
}
