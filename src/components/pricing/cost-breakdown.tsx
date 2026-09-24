import type { MissionPricing } from "@/core/pricing/mission-pricing";
import { formatEuro, formatPercent } from "@/core/shared/format";
import { cn } from "@/utils/cn";

interface Segment {
  id: string;
  label: string;
  amount: number;
  color: string;
}

/**
 * Répartition du prix HT : barre empilée (parties d'un tout) + légende chiffrée,
 * qui sert aussi de vue tableau. Palette catégorielle validée, ordre fixe.
 */
export function CostBreakdown({
  pricing,
  returnLabel,
  className,
}: {
  pricing: MissionPricing;
  returnLabel: string;
  className?: string;
}) {
  const { costs, margin, totals } = pricing;
  const segments: Segment[] = [
    { id: "driver", label: "Convoyeur", amount: costs.driver, color: "var(--series-1)" },
    { id: "fuel", label: "Carburant", amount: costs.fuel, color: "var(--series-2)" },
    { id: "tolls", label: "Péages", amount: costs.tolls, color: "var(--series-3)" },
    { id: "transport", label: returnLabel, amount: costs.access + costs.return, color: "var(--series-4)" },
    {
      id: "fees",
      label: "Frais",
      amount: costs.fixedFees + costs.variableFees + costs.options + costs.other,
      color: "var(--series-5)",
    },
    { id: "margin", label: "Marge", amount: Math.max(0, margin.amount), color: "var(--series-6)" },
  ];
  const total = segments.reduce((sum, segment) => sum + segment.amount, 0);
  const visible = segments.filter((segment) => segment.amount > 0);

  return (
    <figure className={cn("space-y-4", className)}>
      <div className="flex h-3 w-full gap-[2px]" role="img" aria-label="Répartition du prix HT, détaillée ci-dessous">
        {visible.map((segment, index) => (
          <div
            key={segment.id}
            title={`${segment.label} : ${formatEuro(Math.round(segment.amount))}`}
            className={cn(
              "h-full min-w-1",
              index === 0 && "rounded-l-full",
              index === visible.length - 1 && "rounded-r-full",
            )}
            style={{ flexGrow: segment.amount, flexBasis: 0, background: segment.color }}
          />
        ))}
      </div>
      <figcaption className="sr-only">Répartition du prix de {formatEuro(totals.ht)} HT</figcaption>
      <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {segments.map((segment) => (
          <li key={segment.id} className="flex items-center gap-2.5 text-[15px]">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: segment.color }} />
            <span className="min-w-0 flex-1 truncate text-muted">{segment.label}</span>
            <span className="font-medium tabular">{formatEuro(Math.round(segment.amount))}</span>
            <span className="w-11 text-right text-sm text-faint tabular">
              {total > 0 ? formatPercent((segment.amount / total) * 100) : "—"}
            </span>
          </li>
        ))}
      </ul>
      {margin.amount < 0 ? (
        <p className="text-sm font-medium text-danger">Marge négative : le prix ne couvre pas le coût réel.</p>
      ) : null}
    </figure>
  );
}
