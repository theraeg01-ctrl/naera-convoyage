import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";

/**
 * Fonctionnalité non incluse dans l'abonnement. Le message est calculé par
 * le serveur (hasFeature / lowestPlanWith) : aucun test de plan ici.
 */
export function LockedFeature({
  title,
  description,
  planLabel,
  className,
}: {
  title: string;
  description: string;
  planLabel: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-3xl border border-dashed border-border-strong px-6 py-8 text-center",
        className,
      )}
    >
      <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-surface-2 text-faint">
        <Lock className="size-5" aria-hidden />
      </div>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {planLabel ? (
        <Badge tone="accent" size="md" className="mt-4">
          Disponible avec {planLabel}
        </Badge>
      ) : null}
    </div>
  );
}
