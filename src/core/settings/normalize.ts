import { DEFAULT_SETTINGS } from "./defaults";
import { SERVICE_OPTION_IDS, type AppSettings, type ServiceOptionDef } from "./types";

/**
 * Met à niveau des paramètres sauvegardés avec une version antérieure :
 * les options ajoutées depuis sont complétées avec leurs valeurs initiales,
 * dans l'ordre du catalogue. Les valeurs déjà saisies ne sont jamais modifiées.
 */
export function normalizeSettings(stored: AppSettings): AppSettings {
  const byId = new Map<string, ServiceOptionDef>(stored.options.map((option) => [option.id, option]));
  const options = SERVICE_OPTION_IDS.map(
    (id) => byId.get(id) ?? structuredClone(DEFAULT_SETTINGS.options.find((option) => option.id === id)!),
  );
  return { ...stored, options };
}
