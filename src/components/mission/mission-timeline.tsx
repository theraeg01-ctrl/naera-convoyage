import { Check } from "lucide-react";
import { fieldStepsView } from "@/core/mission/progress";
import type { Mission } from "@/core/mission/types";
import { formatEventTime } from "@/utils/dates";
import { cn } from "@/utils/cn";

/** Progression terrain : étapes faites, en cours, à venir. */
export function MissionTimeline({ mission }: { mission: Pick<Mission, "status" | "progress"> }) {
  const steps = fieldStepsView(mission);
  return (
    <ol className="relative space-y-0">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <li key={step.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!last ? (
              <span
                aria-hidden
                className={cn(
                  "absolute top-7 left-[13px] h-[calc(100%-20px)] w-0.5 rounded-full",
                  step.state === "done" ? "bg-success" : "bg-border",
                )}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                step.state === "done" && "border-success bg-success text-surface",
                step.state === "current" && "border-accent bg-accent-soft",
                step.state === "upcoming" && "border-border-strong bg-surface",
              )}
            >
              {step.state === "done" ? <Check className="size-4" strokeWidth={3} aria-hidden /> : null}
              {step.state === "current" ? (
                <span className="size-2.5 animate-pulse rounded-full bg-accent" aria-hidden />
              ) : null}
            </span>
            <div className="flex min-h-7 flex-1 items-center justify-between gap-3">
              <span
                className={cn(
                  "text-[15px]",
                  step.state === "done" && "text-foreground",
                  step.state === "current" && "font-semibold text-foreground",
                  step.state === "upcoming" && "text-faint",
                )}
              >
                {step.label}
                <span className="sr-only">
                  {step.state === "done" ? " — fait" : step.state === "current" ? " — en cours" : " — à venir"}
                </span>
              </span>
              {step.at ? <span className="text-xs text-faint tabular">{formatEventTime(step.at)}</span> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
