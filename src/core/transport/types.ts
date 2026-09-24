import type { DataSource } from "../routing/types";

export const TRANSPORT_MODES = [
  "TRAIN",
  "PUBLIC_TRANSIT",
  "VTC",
  "TAXI",
  "COMPANION",
  "PERSONAL_VEHICLE",
  "OTHER",
] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  TRAIN: "Train",
  PUBLIC_TRANSIT: "Transports en commun",
  VTC: "VTC / Uber",
  TAXI: "Taxi",
  COMPANION: "Accompagnateur",
  PERSONAL_VEHICLE: "Véhicule personnel",
  OTHER: "Autre",
};

/** Détail affiché sous le mode (RER, métro, bus…). */
export const TRANSPORT_MODE_HINTS: Record<TransportMode, string> = {
  TRAIN: "TGV, Intercités, TER",
  PUBLIC_TRANSIT: "RER, métro, bus, car",
  VTC: "Uber, Bolt, Heetch…",
  TAXI: "Taxi conventionné ou non",
  COMPANION: "Un second véhicule suit le convoyeur",
  PERSONAL_VEHICLE: "Véhicule du convoyeur",
  OTHER: "Saisie manuelle",
};

export type LegDirection = "ACCESS" | "RETURN";

export interface TransportOption {
  id: string;
  mode: TransportMode;
  direction: LegDirection;
  price: number;
  durationMin: number;
  connections: number;
  /** 0 = contraignant, 1 = très simple (porte-à-porte, aucune réservation). */
  simplicity: number;
  /** Ex. « TGV direct · Lille-Flandres → Paris-Nord ». */
  detail: string;
  departureTime?: string;
  arrivalTime?: string;
  fromStation?: string;
  toStation?: string;
  distanceKm?: number;
  source: DataSource;
}
