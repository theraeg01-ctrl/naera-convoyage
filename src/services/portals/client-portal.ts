import "server-only";
import type { Actor } from "@/core/access/actor";
import { allowedMissionActions } from "@/core/access/mission-actions";
import { AccessDeniedError } from "@/core/access/permissions";
import { toCustomerMissionView, type CustomerMissionView } from "@/core/access/projections";
import { missionScopeFor } from "@/core/access/scope";
import type { Invoice, PersonalCustomer } from "@/core/accounts/types";
import { sortMissionsBySchedule } from "@/core/mission/filters";
import type { MissionActionId } from "@/core/mission/progress";
import { customerTracking, type TrackingStage } from "@/core/mission/tracking";
import type { MissionStatus } from "@/core/mission/types";
import { assertPersonal, getAppRepositories, getMissionService, type PersonalActor } from "./common";

/**
 * Portail particulier : uniquement les commandes du client connecté, en vue
 * client (prix de vente, suivi simplifié). Aucune donnée interne Naera.
 */

const ACTIVE: readonly MissionStatus[] = ["IN_PROGRESS", "DELIVERED"];
const UPCOMING: readonly MissionStatus[] = ["CONFIRMED", "ASSIGNED"];

async function customerMissions(actor: PersonalActor): Promise<CustomerMissionView[]> {
  const service = await getMissionService();
  return (await service.list(missionScopeFor(actor))).map(toCustomerMissionView);
}

export interface ClientHome {
  firstName: string;
  /** Commande la plus pertinente : en cours, sinon la prochaine. */
  current: (CustomerMissionView & { tracking: TrackingStage[] }) | null;
  toConfirm: CustomerMissionView[];
  count: number;
}

export async function getClientHome(actor: Actor | null): Promise<ClientHome> {
  assertPersonal(actor, "missions.read");
  const missions = await customerMissions(actor);
  const ordered = sortMissionsBySchedule(missions, "asc");
  const current =
    ordered.find((mission) => ACTIVE.includes(mission.status)) ??
    ordered.find((mission) => UPCOMING.includes(mission.status)) ??
    null;
  return {
    firstName: actor.name.split(" ")[0] ?? actor.name,
    current: current ? { ...current, tracking: customerTracking(current) } : null,
    toConfirm: ordered.filter((mission) => mission.status === "QUOTED"),
    count: missions.length,
  };
}

export async function listClientMissions(actor: Actor | null): Promise<CustomerMissionView[]> {
  assertPersonal(actor, "missions.read");
  return sortMissionsBySchedule(await customerMissions(actor));
}

export interface ClientMissionDetail {
  mission: CustomerMissionView;
  tracking: TrackingStage[];
  actions: MissionActionId[];
  invoice: Invoice | null;
}

export async function getClientMission(actor: Actor | null, id: string): Promise<ClientMissionDetail | null> {
  assertPersonal(actor, "missions.read");
  const service = await getMissionService();
  const mission = await service.get(id, missionScopeFor(actor));
  if (!mission) return null;
  const { directory } = await getAppRepositories();
  const invoices = await directory.listInvoices({ kind: "PERSONAL", personalCustomerId: actor.personalCustomerId });
  const view = toCustomerMissionView(mission);
  return {
    mission: view,
    tracking: customerTracking(view),
    actions: allowedMissionActions(actor, mission),
    invoice: invoices.find((invoice) => invoice.missionId === mission.id) ?? null,
  };
}

export interface ClientAccount {
  customer: Pick<PersonalCustomer, "firstName" | "lastName" | "email" | "phone" | "address">;
  invoices: Invoice[];
}

export async function getClientAccount(actor: Actor | null): Promise<ClientAccount> {
  assertPersonal(actor, "billing.read");
  const { directory } = await getAppRepositories();
  const [customer, invoices] = await Promise.all([
    directory.getPersonalCustomer(actor.personalCustomerId),
    directory.listInvoices({ kind: "PERSONAL", personalCustomerId: actor.personalCustomerId }),
  ]);
  if (!customer) throw new AccessDeniedError("FORBIDDEN");
  const { firstName, lastName, email, phone, address } = customer;
  return {
    customer: { firstName, lastName, email, phone, address },
    invoices: [...invoices].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
  };
}
