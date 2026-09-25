/**
 * Détection des champs internes Naera dans une réponse destinée à un client
 * ou à un convoyeur. On inspecte les CLÉS de l'objet JSON réellement renvoyé
 * (récursivement) : coûts, marges, rentabilité, rémunération, notes internes.
 */

/** Noms interdits cités explicitement (et leurs variantes). */
export const FORBIDDEN_FIELD_NAMES = [
  "internalCost",
  "margin",
  "marginRate",
  "marginAmount",
  "driverInternalCost",
  "returnTransportInternalCost",
  "profitability",
  "internalNotes",
  "costs",
  "costTotal",
  "hourlyRate",
  "hourlyDriverCost",
  "pricing",
  "returnAlternatives",
] as const;

/** Toute clé qui évoque un coût, une marge, une rentabilité ou une donnée interne. */
const FORBIDDEN_KEY_PATTERN = /cost|margin|profit|internal|hourlyrate|remuneration|salary|payroll/i;

export function findInternalFields(value: unknown, path = "$"): string[] {
  const found: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => found.push(...findInternalFields(item, `${path}[${index}]`)));
    return found;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if ((FORBIDDEN_FIELD_NAMES as readonly string[]).includes(key) || FORBIDDEN_KEY_PATTERN.test(key)) {
        found.push(`${path}.${key}`);
      }
      found.push(...findInternalFields(child, `${path}.${key}`));
    }
  }
  return found;
}
