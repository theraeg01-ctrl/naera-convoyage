"use client";

import { ChevronRight, LoaderCircle } from "lucide-react";
import { useLinkStatus } from "next/link";
import { cn } from "@/utils/cn";

/**
 * Retour immédiat au toucher d'un lien vers une page serveur : les pages
 * protégées ne diffusent rien avant d'avoir vérifié les droits (statuts
 * HTTP exacts), la navigation peut donc prendre un instant.
 */
export function LinkChevron({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <LoaderCircle className={cn("size-5 animate-spin text-faint", className)} aria-hidden />
  ) : (
    <ChevronRight
      className={cn("size-5 text-faint transition-transform group-hover:translate-x-0.5", className)}
      aria-hidden
    />
  );
}

/** Indicateur discret pour les liens de navigation. */
export function LinkPendingBar({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none h-0.5 w-5 rounded-full bg-accent transition-opacity",
        pending ? "animate-pulse opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}
