import type { MissionPricing } from "@/core/pricing/mission-pricing";
import { formatEuro, formatMinutes } from "@/core/shared/format";

/** Temps convoyeur détaillé : chaque étape de la mission et son coût horaire. */
export function DurationBreakdown({ pricing, hourlyRate }: { pricing: MissionPricing; hourlyRate: number }) {
  const { duration } = pricing;
  const rows = [
    { label: "Trajet jusqu'au véhicule", value: duration.accessMin },
    { label: "Formalités de départ", value: duration.departureFormalitiesMin },
    { label: "Inspection du véhicule", value: duration.inspectionMin },
    { label: "Conduite (avec trafic)", value: duration.drivingMin },
    { label: "Formalités de livraison", value: duration.deliveryFormalitiesMin },
    { label: "Attente prévue", value: duration.waitingMin },
    { label: "Retour du convoyeur", value: duration.returnMin },
  ].filter((row) => row.value > 0);
  return (
    <div className="rounded-3xl border border-border bg-surface px-5 shadow-card">
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.label} className="flex justify-between gap-4 py-3 text-[15px]">
            <span className="text-muted">{row.label}</span>
            <span className="font-medium tabular">{formatMinutes(row.value)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-border-strong py-4">
        <div>
          <p className="font-semibold">Temps convoyeur</p>
          <p className="text-sm text-faint">{formatEuro(hourlyRate, "auto")} / heure</p>
        </div>
        <div className="text-right">
          <p className="font-semibold tabular">{formatMinutes(duration.totalMin)}</p>
          <p className="text-sm text-faint tabular">{formatEuro(pricing.costs.driver, 2)}</p>
        </div>
      </div>
    </div>
  );
}
