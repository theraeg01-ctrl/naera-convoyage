import { normalizeText } from "../geo/geo";

/**
 * Scénarios de démonstration : valeurs fixes et crédibles, toujours
 * affichées avec le libellé « Données de démonstration ».
 */
export interface DemoScenario {
  id: string;
  label: string;
  from: string;
  to: string;
  distanceKm: number;
  durationMin: number;
  tollsEur: number;
  summary: string;
  train: { price: number; durationMin: number; connections: number; fromStation: string; toStation: string };
}

export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  {
    id: "paris-lille",
    label: "Paris → Lille",
    from: "Paris",
    to: "Lille",
    distanceKm: 220,
    durationMin: 150,
    tollsEur: 18,
    summary: "A1",
    train: { price: 32, durationMin: 75, connections: 0, fromStation: "Paris-Nord", toStation: "Lille-Flandres" },
  },
  {
    id: "paris-lyon",
    label: "Paris → Lyon",
    from: "Paris",
    to: "Lyon",
    distanceKm: 465,
    durationMin: 275,
    tollsEur: 38.9,
    summary: "A6",
    train: {
      price: 45,
      durationMin: 120,
      connections: 0,
      fromStation: "Paris-Gare-de-Lyon",
      toStation: "Lyon Part-Dieu",
    },
  },
  {
    id: "paris-rouen",
    label: "Paris → Rouen",
    from: "Paris",
    to: "Rouen",
    distanceKm: 135,
    durationMin: 95,
    tollsEur: 9.9,
    summary: "A13",
    train: {
      price: 18,
      durationMin: 70,
      connections: 0,
      fromStation: "Paris-Saint-Lazare",
      toStation: "Rouen Rive-Droite",
    },
  },
  {
    id: "paris-bordeaux",
    label: "Paris → Bordeaux",
    from: "Paris",
    to: "Bordeaux",
    distanceKm: 585,
    durationMin: 340,
    tollsEur: 57.6,
    summary: "A10",
    train: {
      price: 55,
      durationMin: 130,
      connections: 0,
      fromStation: "Paris-Montparnasse",
      toStation: "Bordeaux Saint-Jean",
    },
  },
];

/** Scénario reconnu entre deux villes (dans un sens ou dans l'autre). */
export function findDemoScenario(
  cityA: string | null,
  cityB: string | null,
): { scenario: DemoScenario; reversed: boolean } | null {
  if (!cityA || !cityB) return null;
  const a = normalizeText(cityA);
  const b = normalizeText(cityB);
  for (const scenario of DEMO_SCENARIOS) {
    const from = normalizeText(scenario.from);
    const to = normalizeText(scenario.to);
    if (a === from && b === to) return { scenario, reversed: false };
    if (a === to && b === from) return { scenario, reversed: true };
  }
  return null;
}
