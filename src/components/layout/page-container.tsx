import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

/** Zone de contenu principale (marges sûres mobiles, place pour la barre d'onglets). */
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main
      id="contenu"
      className={cn(
        "mx-auto w-full max-w-5xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-32 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16",
        className,
      )}
    >
      {children}
    </main>
  );
}
