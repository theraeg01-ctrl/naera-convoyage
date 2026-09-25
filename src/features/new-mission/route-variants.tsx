"use client";

import { ROUTE_KIND_LABELS, type RouteKind, type RouteOption } from "@/core/routing/types";
import { formatEuro, formatMinutes } from "@/core/shared/format";
import { cn } from "@/utils/cn";

/** Choix de l'itinéraire : rapide, économique, sans péage. */
export function RouteVariants({
  routes,
  value,
  onChange,
}: {
  routes: RouteOption[];
  value: RouteKind;
  onChange: (kind: RouteKind) => void;
}) {
  if (routes.length < 2) return null;
  return (
    <fieldset>
      <legend className="sr-only">Itinéraire</legend>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {routes.map((route) => (
          <label
            key={route.kind}
            className={cn(
              "flex min-w-[8.5rem] flex-1 cursor-pointer flex-col rounded-2xl border bg-surface px-3.5 py-2.5 shadow-card transition-colors",
              "has-checked:border-accent has-checked:ring-2 has-checked:ring-accent-soft",
              "border-border hover:border-border-strong has-focus-visible:outline-2 has-focus-visible:outline-accent",
            )}
          >
            <input
              type="radio"
              name="route-kind"
              checked={route.kind === value}
              onChange={() => onChange(route.kind)}
              className="sr-only"
            />
            <span className="text-sm font-semibold">{ROUTE_KIND_LABELS[route.kind]}</span>
            <span className="text-sm text-muted tabular">{formatMinutes(route.trafficDurationMin)}</span>
            <span className="text-xs text-faint tabular">
              {route.tollsEur > 0 ? `${formatEuro(route.tollsEur, 2)} péages` : "Sans péage"} ·{" "}
              {Math.round(route.distanceKm)} km
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
