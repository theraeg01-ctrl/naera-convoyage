"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";

const STAGES = ["Calcul de l'itinéraire…", "Recherche des solutions de retour…", "Calcul du tarif…"];

/** Chargement par étapes, sous forme de squelette de l'écran résultat (pas d'écran bloqué). */
export function SimulationLoading() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setStage((current) => Math.min(current + 1, STAGES.length - 1)), 380);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6" aria-busy="true">
      <ol className="space-y-2.5 rounded-2xl border border-border bg-surface p-5 shadow-card" aria-live="polite">
        {STAGES.map((label, index) => (
          <li key={label} className={cn("flex items-center gap-3 text-[15px]", index > stage && "text-faint")}>
            {index < stage ? (
              <Check className="size-5 text-success" aria-hidden />
            ) : index === stage ? (
              <LoaderCircle className="size-5 animate-spin text-accent" aria-hidden />
            ) : (
              <span className="size-5 rounded-full border-2 border-border" aria-hidden />
            )}
            {label}
          </li>
        ))}
      </ol>
      <div className="space-y-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-6 w-56" />
      </div>
      <Skeleton className="h-52 w-full rounded-[28px]" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
