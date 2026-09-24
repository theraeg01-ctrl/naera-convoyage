import type {
  MissionProgress,
  MissionStatus,
  VehicleInfo,
  ContactPerson,
  CustomerInfo,
  Mission,
} from "../mission/types";
import { customerDisplayName } from "../mission/types";
import type { PriceLine } from "../pricing/options";
import type { VatBreakdown } from "../pricing/vat";
import type { DataMode } from "../simulation/types";
import type { TransportMode, TransportOption } from "../transport/types";

/**
 * Vues (DTO) par audience. Elles sont construites champ par champ à partir
 * d'une liste blanche : aucun coût interne, marge, rémunération, coût de
 * transport ou indicateur de rentabilité ne peut y figurer par inadvertance.
 */

interface PlaceSummary {
  label: string;
  city: string | null;
}

/** Vue client (particulier ou professionnel). */
export interface CustomerMissionView {
  id: string;
  reference: string;
  status: MissionStatus;
  isDemo: boolean;
  dataMode: DataMode;
  createdAt: string;
  scheduledDate: string;
  scheduledTime: string;
  pickup: PlaceSummary;
  dropoff: PlaceSummary;
  route: { distanceKm: number; durationMin: number };
  vehicle: VehicleInfo;
  contact: CustomerInfo | null;
  customerReference: string | null;
  createdByUserId: string | null;
  /** Contacts sur place saisis à la commande. */
  contacts: { pickup: ContactPerson | null; dropoff: ContactPerson | null };
  /** Prestation facturée : lignes et totaux client uniquement. */
  lines: PriceLine[];
  totals: VatBreakdown;
  progress: MissionProgress;
  driverFirstName: string | null;
  events: { id: string; label: string; at: string }[];
}

function placeSummary(place: Mission["pickup"]): PlaceSummary {
  return { label: place.label, city: place.city };
}

function copyLines(lines: readonly PriceLine[]): PriceLine[] {
  return lines.map((line) => ({
    id: line.id,
    label: line.label,
    detail: line.detail,
    amount: line.amount,
    kind: line.kind,
  }));
}

/**
 * Historique visible du client : pas de notes internes, et le convoyeur
 * n'est jamais nommé en entier (le libellé interne peut le citer).
 */
function customerEvents(events: Mission["events"]): CustomerMissionView["events"] {
  return events
    .filter((event) => event.type !== "NOTE")
    .map((event) => ({
      id: event.id,
      label: event.label.startsWith("Convoyeur affecté") ? "Convoyeur affecté" : event.label,
      at: event.at,
    }));
}

export function toCustomerMissionView(mission: Mission): CustomerMissionView {
  const { totals } = mission.pricing;
  return {
    id: mission.id,
    reference: mission.reference,
    status: mission.status,
    isDemo: mission.isDemo,
    dataMode: mission.dataMode,
    createdAt: mission.createdAt,
    scheduledDate: mission.scheduledDate,
    scheduledTime: mission.scheduledTime,
    pickup: placeSummary(mission.pickup),
    dropoff: placeSummary(mission.dropoff),
    route: { distanceKm: mission.route.distanceKm, durationMin: mission.route.trafficDurationMin },
    vehicle: { ...mission.vehicle },
    contact: mission.customer ? { ...mission.customer } : null,
    customerReference: mission.ownership.customerReference,
    createdByUserId: mission.ownership.createdByUserId,
    contacts: {
      pickup: mission.contacts.pickup ? { ...mission.contacts.pickup } : null,
      dropoff: mission.contacts.dropoff ? { ...mission.contacts.dropoff } : null,
    },
    lines: copyLines(mission.pricing.lines),
    totals: { ht: totals.ht, vatPercent: totals.vatPercent, vat: totals.vat, ttc: totals.ttc },
    progress: { ...mission.progress },
    driverFirstName: mission.assignment ? (mission.assignment.driverName.split(" ")[0] ?? null) : null,
    events: customerEvents(mission.events),
  };
}

/** Trajet du convoyeur tel qu'il doit le suivre (horaires, gares), sans prix. */
export interface DriverLegView {
  mode: TransportMode;
  detail: string;
  durationMin: number;
  departureTime: string | null;
  arrivalTime: string | null;
  fromStation: string | null;
  toStation: string | null;
}

function driverLeg(option: TransportOption | null): DriverLegView | null {
  if (!option) return null;
  return {
    mode: option.mode,
    detail: option.detail,
    durationMin: option.durationMin,
    departureTime: option.departureTime ?? null,
    arrivalTime: option.arrivalTime ?? null,
    fromStation: option.fromStation ?? null,
    toStation: option.toStation ?? null,
  };
}

/** Vue convoyeur : ce qu'il faut pour réaliser la mission, rien de financier. */
export interface DriverMissionView {
  id: string;
  reference: string;
  status: MissionStatus;
  isDemo: boolean;
  scheduledDate: string;
  scheduledTime: string;
  pickup: PlaceSummary & { contact: ContactPerson | null };
  dropoff: PlaceSummary & { contact: ContactPerson | null };
  route: { distanceKm: number; durationMin: number; trafficDurationMin: number; summary: string };
  vehicle: VehicleInfo;
  customerName: string;
  accessLeg: DriverLegView | null;
  returnLeg: DriverLegView | null;
  progress: MissionProgress;
  notes: string | null;
}

export function toDriverMissionView(mission: Mission): DriverMissionView {
  return {
    id: mission.id,
    reference: mission.reference,
    status: mission.status,
    isDemo: mission.isDemo,
    scheduledDate: mission.scheduledDate,
    scheduledTime: mission.scheduledTime,
    pickup: {
      ...placeSummary(mission.pickup),
      contact: mission.contacts.pickup ? { ...mission.contacts.pickup } : null,
    },
    dropoff: {
      ...placeSummary(mission.dropoff),
      contact: mission.contacts.dropoff ? { ...mission.contacts.dropoff } : null,
    },
    route: {
      distanceKm: mission.route.distanceKm,
      durationMin: mission.route.durationMin,
      trafficDurationMin: mission.route.trafficDurationMin,
      summary: mission.route.summary,
    },
    vehicle: { ...mission.vehicle },
    customerName: customerDisplayName(mission.customer),
    accessLeg: driverLeg(mission.accessLeg),
    returnLeg: driverLeg(mission.returnLeg),
    progress: { ...mission.progress },
    notes: mission.notes,
  };
}
