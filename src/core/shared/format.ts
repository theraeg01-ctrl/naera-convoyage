/**
 * Formatage partagé (web + future app mobile). Intl est disponible dans
 * Node, les navigateurs et React Native (Hermes).
 */

const euroFormatters = new Map<number, Intl.NumberFormat>();

function euroFormatter(decimals: number): Intl.NumberFormat {
  let formatter = euroFormatters.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    euroFormatters.set(decimals, formatter);
  }
  return formatter;
}

/** « 279 € » si le montant est entier, sinon « 334,80 € ». */
export function formatEuro(value: number, decimals: "auto" | 0 | 2 = "auto"): string {
  const digits = decimals === "auto" ? (Number.isInteger(value) ? 0 : 2) : decimals;
  return euroFormatter(digits).format(value);
}

/** Montant sans symbole, pour les affichages où le « € » est stylé à part. */
export function formatAmount(value: number, decimals: "auto" | 0 | 2 = "auto"): string {
  const digits = decimals === "auto" ? (Number.isInteger(value) ? 0 : 2) : decimals;
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** « 2 h 52 », « 45 min », « 3 h ». */
export function formatMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${String(rest).padStart(2, "0")}`;
}

export function formatKm(distanceKm: number): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(distanceKm)} km`;
}

export function formatPercent(value: number, decimals = 0): string {
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)} %`;
}
