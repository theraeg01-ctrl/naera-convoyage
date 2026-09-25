import type { AssignmentStatus, MissionChannel } from "../accounts/types";
import type { MissionPricing } from "../pricing/mission-pricing";
import type { Place, RouteOption } from "../routing/types";
import type { FuelType, OptimizationStrategy, VehicleCategory } from "../settings/types";
import type { DataMode, MissionRequest } from "../simulation/types";
import type { TransportOption } from "../transport/types";

export const MISSION_STATUSES = [
  "DRAFT",
  "QUOTED",
  "CONFIRMED",
  "ASSIGNED",
  "IN_PROGRESS",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

/**
 * Statuts d'une mission (règles détaillées : docs/mission-lifecycle.md).
 * DELIVERED « Livrée » = véhicule remis physiquement au destinataire (convoyeur).
 * COMPLETED « Terminée » = formalités finalisées : PV signé, documents, frais (Naera) ;
 * la mission devient facturable.
 */
export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  DRAFT: "Brouillon",
  QUOTED: "Devis envoyé",
  CONFIRMED: "Confirmée",
  ASSIGNED: "Assignée",
  IN_PROGRESS: "En cours",
  DELIVERED: "Livrée",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

export const CUSTOMER_TYPES = ["INDIVIDUAL", "PROFESSIONAL"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  INDIVIDUAL: "Particulier",
  PROFESSIONAL: "Professionnel",
};

/**
 * Contact client FIGÉ au moment de la commande (nom, téléphone, e-mail).
 * Ce n'est pas la source de vérité du client : les coordonnées à jour sont
 * dans PersonalCustomer (particulier) ou BusinessAccount + utilisateur (pro).
 * Le snapshot garantit que la mission, le devis et la facture restent
 * cohérents même si le client modifie ses coordonnées plus tard.
 */
export interface CustomerSnapshot {
  type: CustomerType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = {
  CITY: "Citadine",
  SEDAN: "Berline",
  SUV: "SUV",
  VAN: "Utilitaire",
  PREMIUM: "Premium",
};

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  PETROL: "Essence",
  DIESEL: "Diesel",
  HYBRID: "Hybride",
  ELECTRIC: "Électrique",
};

export interface VehicleInfo {
  category: VehicleCategory;
  fuelType: FuelType;
  consumptionPer100?: number;
  make?: string;
  model?: string;
  plate?: string;
}

export const MISSION_EVENT_TYPES = ["CREATED", "STATUS_CHANGED", "CHECKPOINT", "NOTE"] as const;
export type MissionEventType = (typeof MISSION_EVENT_TYPES)[number];

export interface MissionEvent {
  id: string;
  type: MissionEventType;
  label: string;
  at: string;
}

/** Jalons terrain horodatés (ISO). */
export interface MissionProgress {
  startedAt?: string;
  inspectedAt?: string;
  drivingAt?: string;
  deliveredAt?: string;
  completedAt?: string;
}

export interface ContactPerson {
  name: string;
  phone?: string;
}

/**
 * Rattachement de la mission : c'est la clé d'isolation des données.
 * Une mission professionnelle appartient à un BusinessAccount ; une mission
 * de particulier à un PersonalCustomer ; une mission sans compte n'est
 * visible que par Naera.
 */
export interface MissionOwnership {
  channel: MissionChannel;
  businessAccountId: string | null;
  personalCustomerId: string | null;
  createdByUserId: string | null;
  /** Référence interne du client professionnel (bon de commande…). */
  customerReference: string | null;
}

export interface MissionAssignment {
  driverProfileId: string;
  driverName: string;
  status: AssignmentStatus;
  assignedAt: string;
}

export const DEFAULT_OWNERSHIP: MissionOwnership = {
  channel: "BACKOFFICE",
  businessAccountId: null,
  personalCustomerId: null,
  createdByUserId: null,
  customerReference: null,
};

export interface Mission {
  id: string;
  reference: string;
  status: MissionStatus;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  scheduledDate: string;
  scheduledTime: string;
  pickup: Place;
  dropoff: Place;
  /** Contact client figé au moment de la commande (voir CustomerSnapshot). */
  customerSnapshot: CustomerSnapshot | null;
  ownership: MissionOwnership;
  assignment: MissionAssignment | null;
  /** Contacts sur place, transmis au convoyeur. */
  contacts: { pickup: ContactPerson | null; dropoff: ContactPerson | null };
  vehicle: VehicleInfo;
  request: MissionRequest;
  strategy: OptimizationStrategy;
  route: RouteOption;
  accessLeg: TransportOption | null;
  returnLeg: TransportOption | null;
  returnAlternatives: TransportOption[];
  pricing: MissionPricing;
  dataMode: DataMode;
  progress: MissionProgress;
  events: MissionEvent[];
  /** Consignes opérationnelles (accès, clés…) : visibles du convoyeur et du client. */
  notes: string | null;
  /** Notes internes Naera : jamais exposées aux portails client, pro ou convoyeur. */
  internalNotes: string | null;
}

export function customerDisplayName(customer: CustomerSnapshot | null): string {
  if (!customer) return "Client à définir";
  const person = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
  if (customer.type === "PROFESSIONAL" && customer.companyName) return customer.companyName;
  return person || customer.companyName || "Client à définir";
}

export function vehicleDisplayName(vehicle: VehicleInfo): string {
  const name = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return name || VEHICLE_CATEGORY_LABELS[vehicle.category];
}

/** Nom court d'un lieu : la ville si reconnue, sinon l'adresse saisie. */
export function placeShortName(place: Place): string {
  return place.city ?? place.label;
}
