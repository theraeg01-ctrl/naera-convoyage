import { Skeleton } from "@/components/ui/skeleton";

/** Squelette générique de page : titre + cartes, sans bloquer l'interface. */
export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-5 w-64" />
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: cards }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
