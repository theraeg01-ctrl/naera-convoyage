"use server";

import { revalidatePath } from "next/cache";
import { appSettingsSchema } from "@/core/settings/schema";
import type { AppSettings } from "@/core/settings/types";
import { buildSettingsSections } from "@/features/settings/sections";
import { logTechnicalError } from "@/services/logger";
import { getSettings, saveSettings } from "@/services/settings/settings-service";
import { setPath } from "@/utils/object-path";

export interface SettingsFormState {
  status: "idle" | "saved" | "error";
  message: string;
  savedAt?: number;
}

function parseNumber(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (normalized === "") return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Enregistre une section de paramètres : seuls les champs déclarés sont modifiables. */
export async function saveSettingsSectionAction(
  _previous: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  try {
    const current = await getSettings();
    const section = buildSettingsSections(current).find((candidate) => candidate.id === formData.get("sectionId"));
    if (!section) return { status: "error", message: "Section inconnue." };

    const next: AppSettings = structuredClone(current);
    for (const field of section.fields) {
      const raw = formData.get(field.path);
      if (field.kind === "number") {
        const value = parseNumber(raw);
        if (value === null) return { status: "error", message: `« ${field.label} » doit être un nombre.` };
        setPath(next, field.path, field.scale ? value / field.scale : value);
      } else {
        if (typeof raw !== "string" || raw.trim() === "")
          return { status: "error", message: `« ${field.label} » est requis.` };
        setPath(next, field.path, raw.trim());
      }
    }

    const parsed = appSettingsSchema.safeParse(next);
    if (!parsed.success) {
      logTechnicalError("Paramètres refusés", parsed.error);
      return { status: "error", message: "Une valeur est hors limites (négative ou trop élevée). Vérifie la saisie." };
    }
    await saveSettings(next);
    revalidatePath("/settings");
    revalidatePath("/missions/new");
    return { status: "saved", message: "Paramètres enregistrés", savedAt: Date.now() };
  } catch (error) {
    logTechnicalError("saveSettingsSectionAction", error);
    return { status: "error", message: "Enregistrement impossible pour le moment. Réessaie." };
  }
}
