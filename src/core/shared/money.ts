import { assertFinite } from "./errors";

/** Arrondi monétaire au centime (évite les artefacts du type 0,1 + 0,2). */
export function roundMoney(value: number): number {
  assertFinite(value, "Montant");
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function sumMoney(values: readonly number[]): number {
  return roundMoney(values.reduce((total, value) => total + value, 0));
}

/** Part d'un montant dans un total, en pourcentage (null si le total est nul). */
export function shareOf(part: number, total: number): number | null {
  assertFinite(part, "Part");
  assertFinite(total, "Total");
  if (total === 0) return null;
  return (part / total) * 100;
}
