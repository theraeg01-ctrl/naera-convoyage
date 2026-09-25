import { cn } from "@/utils/cn";

/** Indicateur d'étapes compact (3 étapes maximum). */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Étapes">
      {steps.map((step, index) => {
        const state = index < current ? "done" : index === current ? "current" : "upcoming";
        return (
          <li
            key={step}
            className="flex min-w-0 flex-1 flex-col gap-1.5"
            aria-current={state === "current" ? "step" : undefined}
          >
            <span
              className={cn(
                "h-1 rounded-full transition-colors duration-300",
                state === "upcoming" ? "bg-border" : "bg-accent",
              )}
            />
            <span
              className={cn("truncate text-xs font-semibold", state === "upcoming" ? "text-faint" : "text-foreground")}
            >
              {index + 1}. {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
