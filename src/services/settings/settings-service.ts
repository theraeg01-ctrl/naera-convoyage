import { DEFAULT_SETTINGS } from "@/core/settings/defaults";
import { normalizeSettings } from "@/core/settings/normalize";
import { appSettingsSchema } from "@/core/settings/schema";
import type { AppSettings } from "@/core/settings/types";
import { getRepositories } from "@/repositories";
import { logTechnicalError } from "../logger";

/**
 * Source unique des paramètres : tous les calculs passent par ici.
 * En l'absence de paramètres sauvegardés, les valeurs initiales s'appliquent.
 */
export async function getSettings(): Promise<AppSettings> {
  const repositories = await getRepositories();
  const stored = await repositories.settings.get();
  if (!stored) return structuredClone(DEFAULT_SETTINGS);
  const normalized = normalizeSettings(stored);
  const parsed = appSettingsSchema.safeParse(normalized);
  if (parsed.success) return normalized;
  logTechnicalError("Paramètres sauvegardés invalides, valeurs par défaut utilisées", parsed.error);
  return structuredClone(DEFAULT_SETTINGS);
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  const valid = appSettingsSchema.parse(settings) as AppSettings;
  const repositories = await getRepositories();
  return repositories.settings.save(valid);
}
