import "server-only";
import type { Actor } from "@/core/access/actor";
import { allowedMissionActions } from "@/core/access/mission-actions";
import { AccessDeniedError, can } from "@/core/access/permissions";
import { toCustomerMissionView, type CustomerMissionView } from "@/core/access/projections";
import { missionScopeFor } from "@/core/access/scope";
import type { BusinessRole, BusinessSegment, Invoice, MemberStatus } from "@/core/accounts/types";
import {
  computeBusinessAnalytics,
  computeBusinessDashboard,
  type BusinessAnalytics,
  type BusinessDashboard,
} from "@/core/analytics/business-analytics";
import {
  matchesMissionFilter,
  matchesSearch,
  MISSION_FILTERS,
  sortMissionsBySchedule,
  type MissionFilter,
} from "@/core/mission/filters";
import type { MissionActionId } from "@/core/mission/progress";
import { recentActivity, type ActivityItem } from "@/core/mission/activity";
import { customerTracking, type TrackingStage } from "@/core/mission/tracking";
import { FEATURE_LABELS, hasFeature, type Entitlements, type FeatureKey } from "@/core/plans/features";
import { assertBusiness, getAppRepositories, getMissionService, today, type BusinessActor } from "./common";

/**
 * Portail professionnel. Toutes les lectures sont limitées au
 * BusinessAccount de la session et renvoient des vues client : aucun coût,
 * marge ou rémunération Naera ne peut sortir de ce module.
 */

export interface ProAccountSummary {
  id: string;
  name: string;
  segment: BusinessSegment | null;
  city: string | null;
  memberCount: number;
  entitlements: Entitlements;
}

/** Contexte du portail : compte, droits du plan (navigation, écrans verrouillés). */
export async function getProContext(
  actor: Actor | null,
): Promise<{ actor: BusinessActor; account: ProAccountSummary }> {
  assertBusiness(actor, "missions.read");
  const { directory } = await getAppRepositories();
  const view = await directory.getBusinessAccount(actor.businessAccountId);
  if (!view) throw new AccessDeniedError("FORBIDDEN");
  const { account, entitlements, memberCount } = view;
  return {
    actor,
    account: {
      id: account.id,
      name: account.name,
      segment: account.segment,
      city: account.city,
      memberCount,
      entitlements,
    },
  };
}

async function accountMissions(actor: BusinessActor): Promise<CustomerMissionView[]> {
  const service = await getMissionService();
  return (await service.list(missionScopeFor(actor))).map(toCustomerMissionView);
}

/** Dashboard pro : ce qui demande une action, ce qui roule, les dépenses, l'activité. */
export interface ProDashboardData {
  kpis: BusinessDashboard;
  toConfirm: CustomerMissionView[];
  inProgress: CustomerMissionView[];
  activity: ActivityItem[];
}

export async function getProDashboard(actor: Actor | null): Promise<ProDashboardData> {
  assertBusiness(actor, "missions.read");
  const missions = await accountMissions(actor);
  const day = today();
  const pick = (filter: MissionFilter) =>
    sortMissionsBySchedule(
      missions.filter((mission) => matchesMissionFilter(mission, filter, day)),
      "asc",
    );
  return {
    kpis: computeBusinessDashboard(missions, day),
    toConfirm: pick("TO_CONFIRM"),
    inProgress: pick("IN_PROGRESS"),
    activity: recentActivity(missions, new Date()),
  };
}

export interface ProMissionList {
  missions: CustomerMissionView[];
  counts: Record<MissionFilter, number>;
  /** Auteurs des missions (membres du compte). */
  authors: Record<string, string>;
}

export async function listProMissions(
  actor: Actor | null,
  query: { filter: MissionFilter; search?: string },
): Promise<ProMissionList> {
  assertBusiness(actor, "missions.read");
  const [missions, authors] = await Promise.all([accountMissions(actor), memberNames(actor)]);
  const day = today();
  const searched = missions.filter((mission) =>
    matchesSearch(
      [
        mission.reference,
        mission.customerReference,
        mission.pickup.label,
        mission.pickup.city,
        mission.dropoff.label,
        mission.dropoff.city,
        mission.vehicle.make,
        mission.vehicle.model,
        mission.vehicle.plate,
      ],
      query.search ?? "",
    ),
  );
  const counts = Object.fromEntries(
    MISSION_FILTERS.map((filter) => [filter, searched.filter((m) => matchesMissionFilter(m, filter, day)).length]),
  ) as Record<MissionFilter, number>;
  return {
    missions: sortMissionsBySchedule(searched.filter((m) => matchesMissionFilter(m, query.filter, day))),
    counts,
    authors,
  };
}

async function memberNames(actor: BusinessActor): Promise<Record<string, string>> {
  const { directory } = await getAppRepositories();
  const members = await directory.listMembers(actor.businessAccountId);
  return Object.fromEntries(members.map(({ user }) => [user.id, user.name]));
}

export interface ProMissionDetail {
  mission: CustomerMissionView;
  tracking: TrackingStage[];
  actions: MissionActionId[];
  invoice: Invoice | null;
  authorName: string | null;
  canDuplicate: boolean;
}

export async function getProMission(actor: Actor | null, id: string): Promise<ProMissionDetail | null> {
  assertBusiness(actor, "missions.read");
  const service = await getMissionService();
  const mission = await service.get(id, missionScopeFor(actor));
  if (!mission) return null;
  const { directory } = await getAppRepositories();
  const [invoices, authors] = await Promise.all([
    can(actor, "documents.read")
      ? directory.listInvoices({ kind: "BUSINESS", businessAccountId: actor.businessAccountId })
      : Promise.resolve([]),
    memberNames(actor),
  ]);
  const view = toCustomerMissionView(mission);
  return {
    mission: view,
    tracking: customerTracking(view),
    actions: allowedMissionActions(actor, mission),
    invoice: invoices.find((invoice) => invoice.missionId === mission.id) ?? null,
    authorName: view.createdByUserId ? (authors[view.createdByUserId] ?? null) : null,
    canDuplicate: can(actor, "missions.create"),
  };
}

export interface ProBilling {
  invoices: Invoice[];
  outstandingTTC: number;
  paidThisMonthTTC: number;
  spendThisMonthHT: number;
}

export async function getProBilling(actor: Actor | null): Promise<ProBilling> {
  assertBusiness(actor, "billing.read");
  const { directory } = await getAppRepositories();
  const [invoices, missions] = await Promise.all([
    directory.listInvoices({ kind: "BUSINESS", businessAccountId: actor.businessAccountId }),
    accountMissions(actor),
  ]);
  const month = today().slice(0, 7);
  const sum = (list: Invoice[]) =>
    Math.round(list.reduce((total, invoice) => total + invoice.amountTTC, 0) * 100) / 100;
  return {
    invoices: [...invoices].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
    outstandingTTC: sum(invoices.filter((invoice) => invoice.status === "ISSUED" || invoice.status === "OVERDUE")),
    paidThisMonthTTC: sum(invoices.filter((invoice) => invoice.paidAt?.startsWith(month))),
    spendThisMonthHT: computeBusinessDashboard(missions, today()).spendThisMonthHT,
  };
}

/** Analytics : réservé aux rôles autorisés ET aux plans qui incluent la fonctionnalité. */
export async function getProAnalytics(
  actor: Actor | null,
): Promise<BusinessAnalytics & { authors: Record<string, string> }> {
  assertBusiness(actor, "analytics.read");
  const { account } = await getProContext(actor);
  if (!hasFeature(account, "analytics_basic")) throw new AccessDeniedError("FORBIDDEN", "Fonctionnalité non incluse");
  const [missions, authors] = await Promise.all([accountMissions(actor), memberNames(actor)]);
  return { ...computeBusinessAnalytics(missions, today(), account), authors };
}

export interface TeamMemberView {
  id: string;
  name: string;
  email: string;
  role: BusinessRole;
  status: MemberStatus;
  isCurrentUser: boolean;
}

export async function getProTeam(actor: Actor | null): Promise<TeamMemberView[]> {
  assertBusiness(actor, "team.read");
  const { account } = await getProContext(actor);
  if (!hasFeature(account, "team_management")) throw new AccessDeniedError("FORBIDDEN", "Fonctionnalité non incluse");
  const { directory } = await getAppRepositories();
  const members = await directory.listMembers(actor.businessAccountId);
  return members.map(({ member, user }) => ({
    id: member.id,
    name: user.name,
    email: user.email,
    role: member.role,
    status: member.status,
    isCurrentUser: member.id === actor.memberId,
  }));
}

/** Présentation d'une offre (sans prix) : lu dans le catalogue des plans enregistré. */
export interface PlanOffer {
  planLabel: string;
  features: string[];
}

/** Offre la plus accessible qui inclut une fonctionnalité absente du compte. */
export async function getPlanOffer(actor: Actor | null, feature: FeatureKey): Promise<PlanOffer | null> {
  const { account } = await getProContext(actor);
  if (hasFeature(account, feature)) return null;
  const { directory } = await getAppRepositories();
  const plan = (await directory.listPlans()).find((candidate) => candidate.features.includes(feature));
  if (!plan) return null;
  return { planLabel: plan.name, features: plan.features.map((key) => FEATURE_LABELS[key]) };
}
