/**
 * Erreur métier : levée quand une donnée d'entrée rend un calcul impossible
 * (distance négative, prix NaN, durée infinie…). Le message est destiné aux
 * développeurs ; l'interface affiche toujours un message compréhensible.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export function assertFinite(value: number, label: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new DomainError(`${label} doit être un nombre fini (reçu : ${value})`);
  }
}

export function assertNonNegative(value: number, label: string): void {
  assertFinite(value, label);
  if (value < 0) {
    throw new DomainError(`${label} ne peut pas être négatif (reçu : ${value})`);
  }
}

export function assertPositive(value: number, label: string): void {
  assertFinite(value, label);
  if (value <= 0) {
    throw new DomainError(`${label} doit être strictement positif (reçu : ${value})`);
  }
}
