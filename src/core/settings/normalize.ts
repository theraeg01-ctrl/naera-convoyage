import { DEFAULT_SETTINGS } from "./defaults";
import { SERVICE_OPTION_IDS, type AppSettings, type ServiceOptionDef } from "./types";

/**
 * Libellés de forfaits corrigés depuis la première version (affichage
 * uniquement : l'identifiant technique, ex. REGIONAL, ne change pas, aucune
 * migration n'est nécessaire).
 */
const LEGACY_PACKAGE_NAMES: Readonly<Record<string, string>> = { Regional: "Régional" };

export function normalizePackageName(name: string): string {
  return LEGACY_PACKAGE_NAMES[name] ?? name;
}

/**
 * Met à niveau des paramètres sauvegardés avec une version antérieure :
 * les options ajoutées depuis sont complétées avec leurs valeurs initiales,
 * dans l'ordre du catalogue. Les valeurs déjà saisies ne sont jamais modifiées,
 * sauf les anciens libellés de forfaits par défaut (« Regional » → « Régional »).
 */
export function normalizeSettings(stored: AppSettings): AppSettings {
  const byId = new Map<string, ServiceOptionDef>(stored.options.map((option) => [option.id, option]));
  const options = SERVICE_OPTION_IDS.map(
    (id) => byId.get(id) ?? structuredClone(DEFAULT_SETTINGS.options.find((option) => option.id === id)!),
  );
  const packages = stored.packages.map((tier) => ({ ...tier, name: normalizePackageName(tier.name) }));
  return { ...stored, packages, options };
}
