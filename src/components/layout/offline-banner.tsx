"use client";

import { WifiOff } from "lucide-react";
import { useOffline } from "next/offline";

/** Bandeau global : les actions en attente repartent automatiquement au retour du réseau. */
export function OfflineBanner() {
  const isOffline = useOffline();
  if (!isOffline) return null;
  return (
    <div
      role="status"
      className="no-print sticky top-0 z-50 flex items-center justify-center gap-2 bg-warning-soft px-4 py-2 text-sm font-medium text-warning backdrop-blur"
    >
      <WifiOff className="size-4" aria-hidden />
      Hors connexion — les données affichées restent consultables.
    </div>
  );
}
