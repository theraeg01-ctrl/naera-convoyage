import { DomainError } from "../shared/errors";

export const REFERENCE_PREFIX = "NAE-CV";
const REFERENCE_PATTERN = /^NAE-CV-(\d{4})-(\d{4,})$/;

/** Format : NAE-CV-2026-0001. */
export function formatMissionReference(year: number, sequence: number): string {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    throw new DomainError(`Année de référence invalide : ${year}`);
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new DomainError(`Numéro de séquence invalide : ${sequence}`);
  }
  return `${REFERENCE_PREFIX}-${year}-${String(sequence).padStart(4, "0")}`;
}

export function parseMissionReference(reference: string): { year: number; sequence: number } | null {
  const match = REFERENCE_PATTERN.exec(reference);
  if (!match) return null;
  return { year: Number(match[1]), sequence: Number(match[2]) };
}

/** Prochaine référence de l'année : incrément du plus grand numéro existant. */
export function nextMissionReference(existing: readonly string[], year: number): string {
  const highest = existing.reduce((max, reference) => {
    const parsed = parseMissionReference(reference);
    return parsed && parsed.year === year ? Math.max(max, parsed.sequence) : max;
  }, 0);
  return formatMissionReference(year, highest + 1);
}
