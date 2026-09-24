import { Check } from "lucide-react";
import type { TrackingStage } from "@/core/mission/tracking";
import { formatEventTime } from "@/utils/dates";
import { cn } from "@/utils/cn";

/** Suivi client en 5 étapes, lisible d'un coup d'œil. */
export function TrackingSteps({ stages, className }: { stages: TrackingStage[]; className?: string }) {
  return (
    <ol className={cn("space-y-0", className)}>
      {stages.map((stage, index) => {
        const last = index === stages.length - 1;
        return (
          <li key={stage.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!last ? (
              <span
                aria-hidden
                className={cn(
                  "absolute top-7 left-[13px] h-[calc(100%-20px)] w-0.5 rounded-full",
                  stage.state === "done" ? "bg-success" : "bg-border",
                )}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                stage.state === "done" && "border-success bg-success text-surface",
                stage.state === "current" && "border-accent bg-accent-soft",
                stage.state === "upcoming" && "border-border-strong bg-surface",
              )}
            >
              {stage.state === "done" ? <Check className="size-4" strokeWidth={3} aria-hidden /> : null}
              {stage.state === "current" ? (
                <span className="size-2.5 animate-pulse rounded-full bg-accent" aria-hidden />
              ) : null}
            </span>
            <div className="flex min-h-7 flex-1 items-center justify-between gap-3">
              <span
                className={cn(
                  "text-[15px]",
                  stage.state === "current" && "font-semibold",
                  stage.state === "upcoming" && "text-faint",
                )}
              >
                {stage.label}
              </span>
              {stage.at ? (
                <time dateTime={stage.at} className="shrink-0 text-sm text-faint tabular">
                  {formatEventTime(stage.at)}
                </time>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
