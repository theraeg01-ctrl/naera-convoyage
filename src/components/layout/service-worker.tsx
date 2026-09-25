"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker (production uniquement) : les missions déjà
 * ouvertes restent consultables si la connexion devient mauvaise.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Sans service worker, l'application fonctionne normalement (en ligne).
    });
  }, []);
  return null;
}
