"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Segmented } from "@/components/ui/choice";
import { THEME_STORAGE_KEY as STORAGE_KEY } from "./theme-script";

export type ThemePreference = "light" | "dark" | "system";

const THEME_COLORS = { light: "#f4f5f7", dark: "#0a0b0f" } as const;

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function applyTheme(preference: ThemePreference) {
  const dark =
    preference === "dark" || (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const theme = dark ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.removeAttribute("media");
    meta.setAttribute("content", THEME_COLORS[theme]);
  });
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (readPreference() === "system") applyTheme("system");
  };
  media.addEventListener("change", onSystemChange);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onSystemChange);
  };
}

export function useThemePreference(): [ThemePreference, (value: ThemePreference) => void] {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as const);
  const setPreference = (value: ThemePreference) => {
    try {
      if (value === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Stockage indisponible (navigation privée) : le thème s'applique pour la session.
    }
    applyTheme(value);
    listeners.forEach((listener) => listener());
  };
  return [preference, setPreference];
}

const OPTIONS = [
  { value: "light" as const, label: "Clair", icon: <Sun className="size-4" /> },
  { value: "dark" as const, label: "Sombre", icon: <Moon className="size-4" /> },
  { value: "system" as const, label: "Auto", icon: <Monitor className="size-4" /> },
];

export function ThemeToggle({ name = "theme", compact }: { name?: string; compact?: boolean }) {
  const [preference, setPreference] = useThemePreference();
  return (
    <Segmented
      name={name}
      legend="Apparence"
      hideLegend={compact}
      size={compact ? "sm" : "md"}
      options={
        compact
          ? OPTIONS.map((option) => ({ ...option, label: <span className="sr-only">{option.label}</span> }))
          : OPTIONS
      }
      value={preference}
      onChange={setPreference}
    />
  );
}
