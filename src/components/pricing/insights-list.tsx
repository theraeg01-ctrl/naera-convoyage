import { Info, PiggyBank, TriangleAlert } from "lucide-react";
import type { MissionInsight } from "@/core/insights/optimize";
import { cn } from "@/utils/cn";

const TONES = {
  saving: { icon: PiggyBank, className: "bg-success-soft text-success", label: "Économie" },
  warning: { icon: TriangleAlert, className: "bg-warning-soft text-warning", label: "Alerte" },
  info: { icon: Info, className: "bg-accent-soft text-accent", label: "Conseil" },
} as const;

/** Recommandations d'optimisation (3 maximum, par règles métier). */
export function InsightsList({ insights }: { insights: MissionInsight[] }) {
  if (insights.length === 0) {
    return (
      <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">
        Rien à optimiser : cette mission est déjà bien construite.
      </p>
    );
  }
  return (
    <ul className="space-y-2.5">
      {insights.map((insight) => {
        const tone = TONES[insight.tone];
        const Icon = tone.icon;
        return (
          <li
            key={insight.id}
            className="flex animate-rise gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card"
          >
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", tone.className)}>
              <Icon className="size-[18px]" aria-label={tone.label} />
            </span>
            <div>
              <p className="text-[15px] font-medium">{insight.title}</p>
              {insight.detail ? <p className="mt-0.5 text-sm text-muted">{insight.detail}</p> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
