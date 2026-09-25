import type {
  BusinessAccount,
  BusinessMember,
  DriverProfile,
  Invoice,
  PersonalCustomer,
  UserAccount,
} from "@/core/accounts/types";
import type { Actor, ActorContextRef } from "@/core/access/actor";
import type { MissionScope } from "@/core/access/scope";
import type { Mission } from "@/core/mission/types";
import type { Entitlements, FeatureKey, FeatureOverride, PlanCode, SubscriptionStatus } from "@/core/plans/features";
import type { AppSettings } from "@/core/settings/types";

/** Mission prête à être enregistrée : l'identifiant et la référence sont attribués par le dépôt. */
export type NewMission = Omit<Mission, "id" | "reference" | "createdAt" | "updatedAt">;

/**
 * Missions. Toute lecture exige un périmètre (MissionScope) appliqué dans la
 * requête elle-même : c'est le point d'isolation multi-tenant.
 */
export interface MissionRepository {
  list(scope: MissionScope): Promise<Mission[]>;
  findById(id: string, scope: MissionScope): Promise<Mission | null>;
  /** Attribue la prochaine référence NAE-CV-AAAA-NNNN de façon atomique. */
  create(mission: NewMission, now: Date): Promise<Mission>;
  save(mission: Mission): Promise<Mission>;
  count(): Promise<number>;
}

export interface SettingsRepository {
  get(): Promise<AppSettings | null>;
  save(settings: AppSettings): Promise<AppSettings>;
}

export interface BusinessAccountView {
  account: BusinessAccount;
  entitlements: Entitlements;
  memberCount: number;
}

export interface MemberView {
  member: BusinessMember;
  user: UserAccount;
}

export type InvoiceScope =
  { kind: "ALL" } | { kind: "BUSINESS"; businessAccountId: string } | { kind: "PERSONAL"; personalCustomerId: string };

export interface PlanView {
  code: PlanCode;
  name: string;
  features: FeatureKey[];
}

/** Données d'annuaire injectées pour la démonstration (identifiants fixes, idempotent). */
export interface DirectorySeed {
  users: UserAccount[];
  personalCustomers: PersonalCustomer[];
  businessAccounts: BusinessAccount[];
  members: BusinessMember[];
  drivers: DriverProfile[];
  plans: PlanView[];
  subscriptions: { businessAccountId: string; planCode: PlanCode; status: SubscriptionStatus }[];
  overrides: { businessAccountId: string; overrides: FeatureOverride[] }[];
}

/** Comptes, rôles, convoyeurs, plans et factures. */
export interface DirectoryRepository {
  /** Contextes existants (démo : sélecteur d'espace). */
  listActors(): Promise<Actor[]>;
  /** Revalide un contexte de session : l'appartenance est vérifiée en base. */
  resolveActor(userId: string, context: ActorContextRef): Promise<Actor | null>;
  getUser(id: string): Promise<UserAccount | null>;
  getBusinessAccount(id: string): Promise<BusinessAccountView | null>;
  listBusinessAccounts(): Promise<BusinessAccountView[]>;
  listMembers(businessAccountId: string): Promise<MemberView[]>;
  getPersonalCustomer(id: string): Promise<PersonalCustomer | null>;
  listPersonalCustomers(): Promise<PersonalCustomer[]>;
  listDriverProfiles(): Promise<DriverProfile[]>;
  getDriverProfile(id: string): Promise<DriverProfile | null>;
  listInvoices(scope: InvoiceScope): Promise<Invoice[]>;
  listPlans(): Promise<PlanView[]>;
}

export type StorageKind = "postgres" | "local-file";

/** Injection des données de démonstration (stockage local automatique, PostgreSQL via db:seed). */
export interface DemoStore {
  currentVersion(): Promise<number>;
  /** Supprime missions et factures de démonstration (les données réelles sont conservées). */
  clearDemoData(): Promise<void>;
  writeDirectory(seed: DirectorySeed): Promise<void>;
  writeInvoices(invoices: Invoice[]): Promise<void>;
  markVersion(version: number): Promise<void>;
}

export interface Repositories {
  kind: StorageKind;
  missions: MissionRepository;
  settings: SettingsRepository;
  directory: DirectoryRepository;
  demo: DemoStore;
}
