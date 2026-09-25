import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import type { MissionPricing } from "@/core/pricing/mission-pricing";
import { describePricingDecision } from "@/core/pricing/pricing-decision";
import type { AppliedPriceStatus } from "@/core/pricing/profitability";
import { formatEuro, formatPercent } from "@/core/shared/format";
import { cn } from "@/utils/cn";

const APPLIED_STYLES: Record<AppliedPriceStatus, { icon: typeof CircleCheck; tone: string }> = {
  TARGET_REACHED: { icon: CircleCheck, tone: "bg-success-soft text-success" },
  MINIMUM_REACHED: { icon: TriangleAlert, tone: "bg-warning-soft text-warning" },
  BELOW_MINIMUM: { icon: CircleAlert, tone: "bg-danger-soft text-danger" },
};

/**
 * Contrôle de rentabilité en deux temps : le forfait catalogue (orange s'il
 * a fallu l'ajuster), puis le prix final appliqué (vert si la marge cible est
 * atteinte). Les taux affichés sont des taux de marge SUR VENTE.
 */
export function ProfitabilityCard({ pricing, className }: { pricing: MissionPricing; className?: string }) {
  const decision = describePricingDecision(pricing);
  const targets = pricing.marginTargets;
  const targetHint =
    targets?.targetRatePercent !== null && targets?.targetRatePercent !== undefined
      ? `Marge cible ${formatPercent(targets.targetRatePercent)} sur vente`
      : null;
  const applied = APPLIED_STYLES[decision.applied.status];
  const AppliedIcon = applied.icon;
  const PackageIcon = decision.package.adjusted ? TriangleAlert : CircleCheck;
  const rows = [
    { label: "Coût interne", hint: null, value: formatEuro(pricing.costs.total, 2) },
    {
      label: "Prix minimum rentable",
      hint: targets ? `Marge ${formatPercent(targets.minimumRatePercent)} sur vente` : null,
      value: formatEuro(pricing.minimumPrice),
    },
    { label: "Prix cible", hint: targetHint, value: formatEuro(pricing.targetPrice, 2) },
  ];
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-surface shadow-card", className)}>
      <section
        aria-label="Forfait catalogue"
        className={cn(
          "flex items-start gap-3 px-5 py-4",
          decision.package.adjusted ? "bg-warning-soft text-warning" : "bg-success-soft text-success",
        )}
      >
        <PackageIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="min-w-0 text-sm">
          <p className="text-[15px] font-semibold">{decision.package.title}</p>
          <p className="mt-0.5 tabular">Tarif catalogue : {formatEuro(decision.package.price)} HT</p>
          <p className="mt-0.5">{decision.package.detail}</p>
        </div>
      </section>
      {decision.package.adjusted ? (
        <section
          aria-label="Prix final appliqué"
          className={cn("flex items-start gap-3 border-t border-border px-5 py-4", applied.tone)}
        >
          <AppliedIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="min-w-0 text-sm">
            <p className="text-[15px] font-semibold tabular">
              Prix mission appliqué : {formatEuro(decision.applied.price)} HT
            </p>
            <p className="mt-0.5 font-medium">
              {decision.applied.status === "TARGET_REACHED" ? "✓ " : ""}
              {decision.applied.message}
            </p>
            {decision.applied.excludesOptions ? <p className="mt-0.5 opacity-80">Hors options facturées</p> : null}
          </div>
        </section>
      ) : null}
      <dl className="divide-y divide-border px-5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 py-3 text-[15px]">
            <dt className="text-muted">
              {row.label}
              {row.hint ? <span className="block text-xs font-normal text-faint">{row.hint}</span> : null}
            </dt>
            <dd className="font-medium tabular">{row.value} HT</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
