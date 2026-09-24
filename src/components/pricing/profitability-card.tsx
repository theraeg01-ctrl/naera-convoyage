import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import type { MissionPricing } from "@/core/pricing/mission-pricing";
import { formatEuro } from "@/core/shared/format";
import { cn } from "@/utils/cn";

const STYLES = {
  PROFITABLE: { icon: CircleCheck, tone: "bg-success-soft text-success" },
  BELOW_TARGET: { icon: TriangleAlert, tone: "bg-warning-soft text-warning" },
  INSUFFICIENT: { icon: CircleAlert, tone: "bg-danger-soft text-danger" },
} as const;

/** Contrôle de rentabilité : package commercial vs coût réel vs prix minimum rentable. */
export function ProfitabilityCard({ pricing, className }: { pricing: MissionPricing; className?: string }) {
  const { profitability } = pricing;
  const style = STYLES[profitability.status];
  const Icon = style.icon;
  const rows = [
    { label: `Forfait ${pricing.package.name}`, value: formatEuro(pricing.package.price), emphasis: false },
    { label: "Coût réel", value: formatEuro(Math.round(pricing.costs.total)), emphasis: false },
    { label: "Prix minimum rentable", value: formatEuro(pricing.minimumPrice), emphasis: false },
    { label: "Prix recommandé", value: formatEuro(pricing.basePrice), emphasis: true },
  ];
  return (
    <div className={cn("overflow-hidden rounded-3xl border border-border bg-surface shadow-card", className)}>
      <div className={cn("flex items-start gap-3 px-5 py-4", style.tone)}>
        <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">{profitability.message}</p>
          {!profitability.packageIsRecommended ? (
            <p className="mt-0.5 text-sm">Prix recommandé : {formatEuro(pricing.basePrice)} HT</p>
          ) : null}
        </div>
      </div>
      <dl className="divide-y divide-border px-5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-3 text-[15px]">
            <dt className={row.emphasis ? "font-semibold" : "text-muted"}>{row.label}</dt>
            <dd className={cn("tabular", row.emphasis ? "font-semibold" : "font-medium")}>{row.value} HT</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
