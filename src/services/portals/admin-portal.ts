import "server-only";
import type { Actor } from "@/core/access/actor";
import { allowedMissionActions, canPerformMissionAction } from "@/core/access/mission-actions";
import { can } from "@/core/access/permissions";
import {
  BUSINESS_SEGMENT_LABELS,
  personName,
  type DriverProfile,
  type Invoice,
  type MissionChannel,
  type PersonalCustomer,
} from "@/core/accounts/types";
import { sortMissionsBySchedule } from "@/core/mission/filters";
import type { MissionActionId } from "@/core/mission/progress";
import type { Mission, MissionStatus } from "@/core/mission/types";
import { PLAN_LABELS, type Entitlements } from "@/core/plans/features";
import { financeTotals, type FinanceTotals } from "@/core/finance/finance-totals";
import { roundMoney } from "@/core/shared/money";
import { z } from "zod";
import { MissionServiceError } from "../mission/mission-service";
import { run, type UseCaseResult } from "../result";
import { assertStaff, getAppRepositories, getMissionService, today } from "./common";

/**
 * Back-office Naera : vue complète (coûts, marges, rentabilité). Réservé
 * au personnel Naera ; les indicateurs financiers exigent en plus
 * pricing.internal / finance.read selon le rôle.
 */

const ACTIVE: readonly MissionStatus[] = ["ASSIGNED", "IN_PROGRESS", "DELIVERED"];

/** Agrégats financiers : un seul calcul (core/finance), taux toujours sur vente. */
const totals = financeTotals;

export async function listAdminMissions(actor: Actor | null): Promise<Mission[]> {
  assertStaff(actor, "missions.read");
  const service = await getMissionService();
  return service.list({ kind: "ALL" });
}

/** Propriétaire d'une mission, tel qu'affiché à Naera. */
export interface MissionOwnerView {
  channel: MissionChannel;
  kind: "BUSINESS" | "PERSONAL" | "NONE";
  name: string | null;
  createdByName: string | null;
  customerReference: string | null;
}

export interface AdminMissionDetail {
  mission: Mission;
  owner: MissionOwnerView;
  actions: MissionActionId[];
  /** Convoyeurs proposés à l'affectation (vide sans la permission). */
  drivers: DriverProfile[];
  invoice: Invoice | null;
}

export async function getAdminMission(actor: Actor | null, id: string): Promise<AdminMissionDetail | null> {
  assertStaff(actor, "missions.read");
  const service = await getMissionService();
  const mission = await service.get(id, { kind: "ALL" });
  if (!mission) return null;
  const { directory } = await getAppRepositories();
  const { businessAccountId, personalCustomerId, createdByUserId } = mission.ownership;
  const [business, personal, creator, drivers, invoices] = await Promise.all([
    businessAccountId ? directory.getBusinessAccount(businessAccountId) : null,
    personalCustomerId ? directory.getPersonalCustomer(personalCustomerId) : null,
    createdByUserId ? directory.getUser(createdByUserId) : null,
    can(actor, "missions.assign") ? directory.listDriverProfiles() : Promise.resolve([]),
    directory.listInvoices({ kind: "ALL" }),
  ]);
  return {
    mission,
    owner: {
      channel: mission.ownership.channel,
      kind: business ? "BUSINESS" : personal ? "PERSONAL" : "NONE",
      name: business ? business.account.name : personal ? personName(personal) : null,
      createdByName: creator?.name ?? null,
      customerReference: mission.ownership.customerReference,
    },
    actions: allowedMissionActions(actor, mission),
    drivers: drivers.filter((driver) => driver.status === "ACTIVE"),
    invoice: invoices.find((invoice) => invoice.missionId === mission.id) ?? null,
  };
}

export async function performAdminAction(
  actor: Actor | null,
  id: string,
  action: MissionActionId,
): Promise<UseCaseResult<{ id: string }>> {
  return run("performAdminAction", async () => {
    assertStaff(actor, "missions.manage");
    const service = await getMissionService();
    const mission = await service.applyAction(id, action, { kind: "ALL" }, (candidate) =>
      canPerformMissionAction(actor, candidate, action),
    );
    return { id: mission.id };
  });
}

export async function assignDriver(
  actor: Actor | null,
  missionId: string,
  driverProfileId: unknown,
): Promise<UseCaseResult<{ id: string }>> {
  return run("assignDriver", async () => {
    assertStaff(actor, "missions.assign");
    const parsed = z.uuid().safeParse(driverProfileId);
    if (!parsed.success) throw new MissionServiceError("INVALID_INPUT", "Choisis un convoyeur.");
    const { directory } = await getAppRepositories();
    const driver = await directory.getDriverProfile(parsed.data);
    if (!driver) throw new MissionServiceError("INVALID_INPUT", "Ce convoyeur n'existe plus.");
    const service = await getMissionService();
    const mission = await service.assignDriver(missionId, driver);
    return { id: mission.id };
  });
}

export interface BusinessAccountRow extends FinanceTotals {
  id: string;
  name: string;
  segment: string | null;
  city: string | null;
  planLabel: string | null;
  entitlements: Entitlements;
  memberCount: number;
  missionCount: number;
  activeMissions: number;
}

export async function listBusinessAccountsAdmin(actor: Actor | null): Promise<BusinessAccountRow[]> {
  assertStaff(actor, "accounts.read");
  const { directory } = await getAppRepositories();
  const [accounts, missions] = await Promise.all([directory.listBusinessAccounts(), listAdminMissions(actor)]);
  return accounts.map(({ account, entitlements, memberCount }) => {
    const own = missions.filter((mission) => mission.ownership.businessAccountId === account.id);
    return {
      id: account.id,
      name: account.name,
      segment: account.segment ? BUSINESS_SEGMENT_LABELS[account.segment] : null,
      city: account.city,
      planLabel: entitlements.planCode ? PLAN_LABELS[entitlements.planCode] : null,
      entitlements,
      memberCount,
      missionCount: own.length,
      activeMissions: own.filter((mission) => ACTIVE.includes(mission.status)).length,
      ...totals(own),
    };
  });
}

export interface PersonalCustomerRow extends FinanceTotals {
  customer: PersonalCustomer;
  hasOnlineAccount: boolean;
  missionCount: number;
  lastMissionDate: string | null;
}

export async function listPersonalCustomersAdmin(actor: Actor | null): Promise<PersonalCustomerRow[]> {
  assertStaff(actor, "accounts.read");
  const { directory } = await getAppRepositories();
  const [customers, missions] = await Promise.all([directory.listPersonalCustomers(), listAdminMissions(actor)]);
  return customers.map((customer) => {
    const own = sortMissionsBySchedule(missions.filter((m) => m.ownership.personalCustomerId === customer.id));
    return {
      customer,
      hasOnlineAccount: customer.userId !== null,
      missionCount: own.length,
      lastMissionDate: own[0]?.scheduledDate ?? null,
      ...totals(own),
    };
  });
}

export interface DriverRow {
  driver: DriverProfile;
  current: Pick<Mission, "id" | "reference" | "status"> | null;
  upcoming: number;
  completedThisMonth: number;
  /** Rémunération convoyeur du mois (coût interne). */
  driverCostThisMonth: number;
}

export async function listDriversAdmin(actor: Actor | null): Promise<DriverRow[]> {
  assertStaff(actor, "drivers.read");
  const { directory } = await getAppRepositories();
  const [drivers, missions] = await Promise.all([directory.listDriverProfiles(), listAdminMissions(actor)]);
  const month = today().slice(0, 7);
  return drivers.map((driver) => {
    const own = missions.filter((mission) => mission.assignment?.driverProfileId === driver.id);
    const current = own.find((mission) => mission.status === "IN_PROGRESS" || mission.status === "DELIVERED");
    const doneThisMonth = own.filter(
      (mission) => mission.status === "COMPLETED" && mission.scheduledDate.startsWith(month),
    );
    return {
      driver,
      current: current ? { id: current.id, reference: current.reference, status: current.status } : null,
      upcoming: own.filter((mission) => mission.status === "ASSIGNED" || mission.status === "CONFIRMED").length,
      completedThisMonth: doneThisMonth.length,
      driverCostThisMonth: roundMoney(doneThisMonth.reduce((t, m) => t + m.pricing.costs.driver, 0)),
    };
  });
}

/** Devis : brouillons et devis envoyés en attente de réponse. */
export async function listQuotesAdmin(actor: Actor | null): Promise<Mission[]> {
  assertStaff(actor, "missions.manage");
  const missions = await listAdminMissions(actor);
  return sortMissionsBySchedule(
    missions.filter((mission) => mission.status === "DRAFT" || mission.status === "QUOTED"),
    "asc",
  );
}

export interface FinanceMonth extends FinanceTotals {
  month: string;
}

export interface FinanceOverview {
  month: FinanceMonth;
  months: FinanceMonth[];
  receivablesTTC: number;
  paidThisMonthTTC: number;
  topAccounts: ({ name: string } & FinanceTotals)[];
}

function monthsBack(day: string, count: number): string[] {
  const [year, month] = day.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const offset = year * 12 + (month - 1) - (count - 1 - index);
    return `${Math.floor(offset / 12)}-${String((offset % 12) + 1).padStart(2, "0")}`;
  });
}

export async function getFinanceOverview(actor: Actor | null): Promise<FinanceOverview> {
  assertStaff(actor, "finance.read");
  const { directory } = await getAppRepositories();
  const [missions, invoices, accounts] = await Promise.all([
    listAdminMissions(actor),
    directory.listInvoices({ kind: "ALL" }),
    directory.listBusinessAccounts(),
  ]);
  const day = today();
  const months = monthsBack(day, 6).map((month) => {
    const inMonth = missions.filter((mission) => mission.scheduledDate.startsWith(month));
    return { month, ...totals(inMonth) };
  });
  const current = months[months.length - 1];
  const sumTTC = (list: Invoice[]) => roundMoney(list.reduce((t, invoice) => t + invoice.amountTTC, 0));
  const topAccounts = accounts
    .map(({ account }) => {
      const own = missions.filter(
        (mission) =>
          mission.ownership.businessAccountId === account.id && mission.scheduledDate.startsWith(current.month),
      );
      return { name: account.name, ...totals(own) };
    })
    .filter((row) => row.revenueHT > 0)
    .sort((a, b) => b.grossMarginHT - a.grossMarginHT);
  return {
    month: current,
    months,
    receivablesTTC: sumTTC(invoices.filter((invoice) => invoice.status === "ISSUED" || invoice.status === "OVERDUE")),
    paidThisMonthTTC: sumTTC(invoices.filter((invoice) => invoice.paidAt?.startsWith(current.month))),
    topAccounts,
  };
}
