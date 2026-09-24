/**
 * Comptes et acteurs de la plateforme : utilisateurs, particuliers,
 * entreprises (multi-utilisateurs), convoyeurs, factures.
 */

export const STAFF_ROLES = ["ADMIN", "DISPATCHER"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  ADMIN: "Administrateur Naera",
  DISPATCHER: "Exploitation Naera",
};

export const BUSINESS_ROLES = ["OWNER", "MANAGER", "OPERATOR", "BILLING"] as const;
export type BusinessRole = (typeof BUSINESS_ROLES)[number];

export const BUSINESS_ROLE_LABELS: Record<BusinessRole, string> = {
  OWNER: "Propriétaire",
  MANAGER: "Responsable",
  OPERATOR: "Opérateur",
  BILLING: "Facturation",
};

export const BUSINESS_ROLE_DESCRIPTIONS: Record<BusinessRole, string> = {
  OWNER: "Accès complet, gestion de l'équipe et du compte",
  MANAGER: "Missions, facturation, analytics et équipe (lecture)",
  OPERATOR: "Création et suivi des missions",
  BILLING: "Factures, dépenses et documents",
};

export const BUSINESS_SEGMENTS = ["GARAGE", "USED_CAR_DEALER", "DEALERSHIP", "RENTAL", "FLEET", "OTHER"] as const;
export type BusinessSegment = (typeof BUSINESS_SEGMENTS)[number];

export const BUSINESS_SEGMENT_LABELS: Record<BusinessSegment, string> = {
  GARAGE: "Garage",
  USED_CAR_DEALER: "Marchand VO",
  DEALERSHIP: "Concession",
  RENTAL: "Loueur",
  FLEET: "Flotte automobile",
  OTHER: "Autre",
};

export const MEMBER_STATUSES = ["INVITED", "ACTIVE", "DISABLED"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const DRIVER_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type DriverStatus = (typeof DRIVER_STATUSES)[number];

export const ASSIGNMENT_STATUSES = ["PROPOSED", "ACCEPTED", "DECLINED", "CANCELLED"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const INVOICE_STATUSES = ["DRAFT", "ISSUED", "PAID", "OVERDUE", "CANCELLED"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Brouillon",
  ISSUED: "À régler",
  PAID: "Payée",
  OVERDUE: "En retard",
  CANCELLED: "Annulée",
};

/** Canal par lequel la mission a été créée. */
export const MISSION_CHANNELS = ["BACKOFFICE", "CLIENT_PORTAL", "PRO_PORTAL", "API"] as const;
export type MissionChannel = (typeof MISSION_CHANNELS)[number];

export const MISSION_CHANNEL_LABELS: Record<MissionChannel, string> = {
  BACKOFFICE: "Back-office Naera",
  CLIENT_PORTAL: "Espace client",
  PRO_PORTAL: "Espace professionnel",
  API: "API",
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  PROPOSED: "Proposée",
  ACCEPTED: "Acceptée",
  DECLINED: "Refusée",
  CANCELLED: "Annulée",
};

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  /** Rôle back-office Naera (null = pas un membre de l'équipe Naera). */
  staffRole: StaffRole | null;
}

export interface PersonalCustomer {
  id: string;
  /** Compte de connexion (null = client saisi par Naera, sans espace en ligne). */
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface BusinessAccount {
  id: string;
  name: string;
  segment: BusinessSegment | null;
  billingEmail: string | null;
  city: string | null;
  pricingProfileId: string | null;
}

export interface BusinessMember {
  id: string;
  businessAccountId: string;
  userId: string;
  role: BusinessRole;
  status: MemberStatus;
}

export interface DriverProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  homeCity: string | null;
  status: DriverStatus;
}

export interface Invoice {
  id: string;
  number: string;
  missionId: string | null;
  businessAccountId: string | null;
  personalCustomerId: string | null;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string | null;
  paidAt: string | null;
  amountHT: number;
  vatAmount: number;
  amountTTC: number;
}

export function personName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}
