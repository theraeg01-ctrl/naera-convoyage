import { FlaskConical } from "lucide-react";
import { cn } from "@/utils/cn";

/** Signale clairement les données de démonstration / simulées. */
export function DemoBanner({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2.5 rounded-2xl border border-dashed border-border-strong bg-surface-2/60 px-4 py-3 text-sm text-muted",
        className,
      )}
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden />
      <p>
        <span className="font-semibold text-foreground">Données de démonstration.</span>{" "}
        {children ?? "Itinéraires, trafic, péages et transports sont simulés tant que les API ne sont pas connectées."}
      </p>
    </div>
  );
}
