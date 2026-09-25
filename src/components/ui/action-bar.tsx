import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

/**
 * Barre d'action principale : fixée en bas de l'écran sur mobile (zone du pouce),
 * intégrée au contenu sur grand écran.
 */
export function ActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl",
        "lg:static lg:z-auto lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none",
        className,
      )}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3 lg:mx-0 lg:max-w-none">{children}</div>
    </div>
  );
}
