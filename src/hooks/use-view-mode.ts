"use client";

import { useSyncExternalStore } from "react";

/** Mode interne (coûts, marge) ou client (prix uniquement). Mémorisé sur l'appareil. */
export type ViewMode = "internal" | "client";

const KEY = "naera-view-mode";
const listeners = new Set<() => void>();
let memory: ViewMode | null = null;

function read(): ViewMode {
  if (memory) return memory;
  try {
    return localStorage.getItem(KEY) === "client" ? "client" : "internal";
  } catch {
    return "internal";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const mode = useSyncExternalStore(subscribe, read, () => "internal" as const);
  const setMode = (next: ViewMode) => {
    memory = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Stockage indisponible : le mode reste valable pour la session.
    }
    listeners.forEach((listener) => listener());
  };
  return [mode, setMode];
}
