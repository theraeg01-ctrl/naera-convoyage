import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

/** Indicateur clé : libellé + valeur (chiffres proportionnels) + précision facultative. */
export function StatTile({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-4 shadow-card", className)}>
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-faint">{hint}</p> : null}
    </div>
  );
}
