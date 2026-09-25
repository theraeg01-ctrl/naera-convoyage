import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { DATA_SOURCE_LABELS, type DataSource } from "@/core/routing/types";
import { cn } from "@/utils/cn";

export const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 rounded-full font-semibold whitespace-nowrap [&_svg]:size-3.5",
  {
    variants: {
      tone: {
        neutral: "bg-surface-2 text-muted",
        accent: "bg-accent-soft text-accent",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        outline: "border border-border text-muted",
      },
      size: {
        sm: "h-6 px-2 text-xs",
        md: "h-7 px-2.5 text-[13px]",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  },
);

export function Badge({
  className,
  tone,
  size,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}

const SOURCE_TONES: Record<DataSource, VariantProps<typeof badgeVariants>["tone"]> = {
  LIVE: "success",
  ESTIMATED: "accent",
  SIMULATED: "outline",
  MANUAL: "warning",
};

/** Origine d'une donnée : LIVE, ESTIMÉ, SIMULÉ ou MANUEL — jamais de mélange silencieux. */
export function DataSourceBadge({ source, className }: { source: DataSource; className?: string }) {
  return (
    <span
      className={cn(
        badgeVariants({ tone: SOURCE_TONES[source], size: "sm" }),
        "h-5 px-1.5 text-[11px] uppercase tracking-wider",
        className,
      )}
      title={`Donnée ${DATA_SOURCE_LABELS[source].toLowerCase()}`}
    >
      {source === "LIVE" ? <span aria-hidden className="size-1.5 rounded-full bg-current" /> : null}
      {DATA_SOURCE_LABELS[source]}
    </span>
  );
}
