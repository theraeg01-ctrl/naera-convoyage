import type { MissionPricing } from "@/core/pricing/mission-pricing";
import { formatAmount, formatEuro, formatPercent } from "@/core/shared/format";
import { cn } from "@/utils/cn";

interface PriceCardProps {
  pricing: MissionPricing;
  mode: "internal" | "client";
  label?: string;
  className?: string;
}

/** Le prix conseillé HT est l'information la plus visible de l'écran. */
export function PriceCard({ pricing, mode, label = "Prix conseillé", className }: PriceCardProps) {
  const { totals, costs, margin } = pricing;
  return (
    <div className={cn("bg-price relative overflow-hidden rounded-[28px] p-6 text-price-fg shadow-float", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 size-56 rounded-full bg-[radial-gradient(closest-side,rgba(123,150,255,0.28),transparent)]"
      />
      <p className="text-[13px] font-semibold tracking-[0.12em] text-price-muted uppercase">{label}</p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-[56px] leading-none font-bold tracking-tight sm:text-6xl">{formatAmount(totals.ht)}</span>
        <span className="text-xl font-semibold text-price-muted">€ HT</span>
      </p>
      <p className="mt-3 text-lg font-medium">
        {formatEuro(totals.ttc, 2)} <span className="text-price-muted">TTC</span>
      </p>
      <p className="mt-0.5 text-sm text-price-muted">
        dont TVA {formatPercent(totals.vatPercent)} : {formatEuro(totals.vat, 2)}
      </p>
      {mode === "internal" ? (
        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-(--price-line) pt-4">
          <div>
            <dt className="text-xs font-medium text-price-muted">Coût interne</dt>
            <dd className="mt-0.5 text-base font-semibold tabular">{formatEuro(costs.total, 2)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-price-muted">Marge brute</dt>
            <dd className="mt-0.5 text-base font-semibold tabular">{formatEuro(margin.grossMargin, 2)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-price-muted">Taux de marge sur vente</dt>
            <dd className="mt-0.5 text-base font-semibold tabular">
              {margin.grossMarginRate === null ? "—" : formatPercent(margin.grossMarginRate, 1)}
            </dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
