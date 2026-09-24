import { ArrowDown } from "lucide-react";
import type { Place, RouteOption } from "@/core/routing/types";
import { formatKm, formatMinutes } from "@/core/shared/format";
import { DataSourceBadge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";

interface RouteSummaryProps {
  pickup: Place;
  dropoff: Place;
  route: RouteOption;
  showSource?: boolean;
  className?: string;
}

function placeTitle(place: Place) {
  return (place.city ?? place.label).toUpperCase();
}

/** En-tête d'itinéraire : PARIS ↓ LILLE · 220 KM · 2 H 52 (durée avec trafic). */
export function RouteSummary({ pickup, dropoff, route, showSource = true, className }: RouteSummaryProps) {
  const trafficDelay = route.trafficDurationMin - route.durationMin;
  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <p className="truncate text-[32px] leading-none font-bold tracking-tight sm:text-4xl" title={pickup.label}>
          {placeTitle(pickup)}
        </p>
        <ArrowDown className="my-1 size-6 text-accent" aria-label="vers" strokeWidth={2.5} />
        <p className="truncate text-[32px] leading-none font-bold tracking-tight sm:text-4xl" title={dropoff.label}>
          {placeTitle(dropoff)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-xl font-semibold tracking-tight tabular">{formatKm(route.distanceKm).toUpperCase()}</p>
        <span className="h-5 w-px bg-border-strong" aria-hidden />
        <p className="text-xl font-semibold tracking-tight tabular">
          {formatMinutes(route.trafficDurationMin).toUpperCase()}
        </p>
        {showSource ? <DataSourceBadge source={route.source} /> : null}
      </div>
      <p className="text-sm text-muted">
        Durée estimée avec trafic
        {trafficDelay > 0 ? ` · dont ${formatMinutes(trafficDelay)} de ralentissements` : ""}
        {route.summary ? ` · ${route.summary}` : ""}
      </p>
    </div>
  );
}
