import type { MissionPricing } from "@/core/pricing/mission-pricing";
import { formatEuro, formatPercent } from "@/core/shared/format";
import { cn } from "@/utils/cn";

/** Détail de la prestation tel que le voit le client : lignes, HT, TVA, TTC. */
export function QuoteSummary({
  pricing,
  className,
}: {
  /** Uniquement les lignes et totaux client (une vue client suffit). */
  pricing: Pick<MissionPricing, "lines" | "totals">;
  className?: string;
}) {
  const { lines, totals } = pricing;
  return (
    <div className={cn("rounded-2xl border border-border bg-surface px-5 shadow-card", className)}>
      <ul className="divide-y divide-border">
        {lines.map((line) => (
          <li key={line.id} className="flex items-start justify-between gap-4 py-3.5">
            <div className="min-w-0">
              <p className="text-[15px] font-medium">{line.label}</p>
              {line.detail ? <p className="text-sm text-faint">{line.detail}</p> : null}
            </div>
            <p className="shrink-0 text-[15px] font-medium tabular">{formatEuro(line.amount, 2)}</p>
          </li>
        ))}
      </ul>
      <dl className="space-y-1.5 border-t border-border-strong py-4 text-[15px]">
        <div className="flex justify-between">
          <dt className="text-muted">Total HT</dt>
          <dd className="font-semibold tabular">{formatEuro(totals.ht, 2)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">TVA {formatPercent(totals.vatPercent)}</dt>
          <dd className="tabular">{formatEuro(totals.vat, 2)}</dd>
        </div>
        <div className="flex justify-between pt-1 text-base">
          <dt className="font-semibold">Total TTC</dt>
          <dd className="font-bold tabular">{formatEuro(totals.ttc, 2)}</dd>
        </div>
      </dl>
    </div>
  );
}
