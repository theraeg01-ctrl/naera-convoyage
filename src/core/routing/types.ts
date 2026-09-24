/**
 * Origine d'une donnée externe. Chaque valeur affichée doit pouvoir dire
 * si elle est réelle, estimée, simulée ou saisie à la main.
 */
export const DATA_SOURCES = ["LIVE", "ESTIMATED", "SIMULATED", "MANUAL"] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

export const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  LIVE: "Live",
  ESTIMATED: "Estimé",
  SIMULATED: "Simulé",
  MANUAL: "Manuel",
};

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Place {
  /** Adresse telle que saisie ou choisie. */
  label: string;
  /** Ville reconnue (null si l'adresse n'a pas pu être localisée). */
  city: string | null;
  postalCode: string | null;
  point: GeoPoint | null;
}

export const ROUTE_KINDS = ["FASTEST", "ECONOMIC", "NO_TOLL"] as const;
export type RouteKind = (typeof ROUTE_KINDS)[number];

export const ROUTE_KIND_LABELS: Record<RouteKind, string> = {
  FASTEST: "Rapide",
  ECONOMIC: "Économique",
  NO_TOLL: "Sans péage",
};

export interface RouteOption {
  kind: RouteKind;
  distanceKm: number;
  /** Durée sans trafic. */
  durationMin: number;
  /** Durée estimée avec trafic à l'heure prévue. */
  trafficDurationMin: number;
  tollsEur: number;
  /** Axes principaux, ex. « A1 ». */
  summary: string;
  polyline?: string;
  source: DataSource;
}
