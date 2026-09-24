import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement de la mission">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-60 rounded-3xl" />
      <Skeleton className="h-52 rounded-[28px]" />
    </div>
  );
}
