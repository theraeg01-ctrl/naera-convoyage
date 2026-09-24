import type { CustomerMissionView } from "../access/projections";
import type { MissionStatus, VehicleInfo } from "../mission/types";
import { hasFeature, type Entitlements } from "../plans/features";
import { addDays } from "../shared/calendar";
import { roundMoney } from "../shared/money";

/**
 * BusinessAnalytics : indicateurs d'un compte professionnel, calculés sur
 * les prix CLIENT (jamais sur les coûts Naera). Les blocs se débloquent
 * selon les fonctionnalités du plan.
 */

const BOOKED: readonly MissionStatus[] = ["CONFIRMED", "ASSIGNED", "IN_PROGRESS", "DELIVERED", "COMPLETED"];
const DONE: readonly MissionStatus[] = ["DELIVERED", "COMPLETED"];

const inMonth = (mission: CustomerMissionView, month: string) => mission.scheduledDate.startsWith(month);
const sumHT = (missions: readonly CustomerMissionView[]) => roundMoney(missions.reduce((t, m) => t + m.totals.ht, 0));
const sumKm = (missions: readonly CustomerMissionView[]) =>
  Math.round(missions.reduce((t, m) => t + m.route.distanceKm, 0));

export interface BusinessDashboard {
  missionsToday: number;
  inProgress: number;
  completedThisMonth: number;
  toConfirm: number;
  missionsThisMonth: number;
  spendThisMonthHT: number;
  spendThisMonthTTC: number;
  convoyedKmThisMonth: number;
}

/** Tableau de bord professionnel (sans aucune donnée de marge Naera). */
export function computeBusinessDashboard(missions: readonly CustomerMissionView[], today: string): BusinessDashboard {
  const month = today.slice(0, 7);
  const thisMonth = missions.filter((mission) => inMonth(mission, month));
  const booked = thisMonth.filter((mission) => BOOKED.includes(mission.status));
  const done = thisMonth.filter((mission) => DONE.includes(mission.status));
  return {
    missionsToday: missions.filter((m) => m.scheduledDate === today && m.status !== "CANCELLED").length,
    inProgress: missions.filter((m) => m.status === "IN_PROGRESS").length,
    completedThisMonth: done.length,
    toConfirm: missions.filter((m) => m.status === "QUOTED").length,
    missionsThisMonth: thisMonth.filter((m) => m.status !== "CANCELLED").length,
    spendThisMonthHT: sumHT(booked),
    spendThisMonthTTC: roundMoney(booked.reduce((t, m) => t + m.totals.ttc, 0)),
    convoyedKmThisMonth: sumKm(done),
  };
}

export interface MonthlySpend {
  month: string;
  spendHT: number;
  missions: number;
}

export interface BasicAnalytics {
  missionCount: number;
  totalSpendHT: number;
  averageCostPerMission: number | null;
  averageCostPerKm: number | null;
  convoyedKm: number;
  monthly: MonthlySpend[];
}

export interface AdvancedAnalytics {
  averageLeadTimeDays: number | null;
  spendByVehicleCategory: { category: VehicleInfo["category"]; spendHT: number; missions: number }[];
  spendByUser: { userId: string | null; spendHT: number; missions: number }[];
}

export interface BusinessAnalytics {
  month: string;
  basic: BasicAnalytics | null;
  advanced: AdvancedAnalytics | null;
}

function previousMonths(today: string, count: number): string[] {
  const months: string[] = [];
  let cursor = `${today.slice(0, 7)}-01`;
  for (let index = 0; index < count; index += 1) {
    months.unshift(cursor.slice(0, 7));
    cursor = `${addDays(cursor, -1).slice(0, 7)}-01`;
  }
  return months;
}

function groupSpend<K>(missions: readonly CustomerMissionView[], key: (mission: CustomerMissionView) => K) {
  const groups = new Map<K, { spendHT: number; missions: number }>();
  for (const mission of missions) {
    const entry = groups.get(key(mission)) ?? { spendHT: 0, missions: 0 };
    entry.spendHT = roundMoney(entry.spendHT + mission.totals.ht);
    entry.missions += 1;
    groups.set(key(mission), entry);
  }
  return [...groups.entries()].sort((a, b) => b[1].spendHT - a[1].spendHT);
}

function computeBasic(booked: readonly CustomerMissionView[], today: string): BasicAnalytics {
  const month = today.slice(0, 7);
  const current = booked.filter((mission) => inMonth(mission, month));
  const spend = sumHT(current);
  const km = sumKm(current);
  return {
    missionCount: current.length,
    totalSpendHT: spend,
    averageCostPerMission: current.length > 0 ? roundMoney(spend / current.length) : null,
    averageCostPerKm: km > 0 ? roundMoney(spend / km) : null,
    convoyedKm: sumKm(current.filter((mission) => DONE.includes(mission.status))),
    monthly: previousMonths(today, 6).map((m) => {
      const missions = booked.filter((mission) => inMonth(mission, m));
      return { month: m, spendHT: sumHT(missions), missions: missions.length };
    }),
  };
}

function computeAdvanced(booked: readonly CustomerMissionView[]): AdvancedAnalytics {
  const leadTimes = booked.map(
    (mission) => (Date.parse(`${mission.scheduledDate}T00:00:00Z`) - Date.parse(mission.createdAt)) / 86_400_000,
  );
  const positive = leadTimes.filter((days) => Number.isFinite(days) && days >= 0);
  return {
    averageLeadTimeDays:
      positive.length > 0 ? Math.round((positive.reduce((t, d) => t + d, 0) / positive.length) * 10) / 10 : null,
    spendByVehicleCategory: groupSpend(booked, (m) => m.vehicle.category).map(([category, value]) => ({
      category,
      ...value,
    })),
    spendByUser: groupSpend(booked, (m) => m.createdByUserId).map(([userId, value]) => ({ userId, ...value })),
  };
}

export function computeBusinessAnalytics(
  missions: readonly CustomerMissionView[],
  today: string,
  account: { entitlements: Entitlements },
): BusinessAnalytics {
  const booked = missions.filter((mission) => BOOKED.includes(mission.status));
  return {
    month: today.slice(0, 7),
    basic: hasFeature(account, "analytics_basic") ? computeBasic(booked, today) : null,
    advanced: hasFeature(account, "analytics_advanced") ? computeAdvanced(booked) : null,
  };
}
