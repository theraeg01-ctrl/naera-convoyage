"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Jamais d'erreur technique à l'écran : message clair + nouvelle tentative. */
export function ErrorView({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <EmptyState
      className="mt-10"
      icon={<TriangleAlert />}
      title="Un imprévu est survenu"
      description="Les données n'ont pas pu être chargées. Réessaie dans un instant."
      action={
        <Button onClick={() => retry()}>
          <RotateCcw aria-hidden />
          Réessayer
        </Button>
      }
    />
  );
}
