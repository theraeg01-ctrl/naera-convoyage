import { roundMoney } from "../shared/money";
import type { Mission, MissionStatus } from "./types";

/** Statuts comptés dans le chiffre d'affaires (mission engagée, non annulée). */
const BOOKED_STATUSES: readonly MissionStatus[] = ["CONFIRMED", "ASSIGNED", "IN_PROGRESS", "DELIVERED", "COMPLETED"];
const CONVOYED_STATUSES: readonly MissionStatus[] = ["DELIVERED", "COMPLETED"];

export interface DashboardKpis {
  revenueHT: number;
  /** Taux de marge moyen (marge / coût), pondéré par le coût. */
  averageMarginRate: number | null;
  averageMarginAmount: number | null;
  missionCount: number;
  convoyedKm: number;
}

/** Indicateurs du mois (month = « YYYY-MM »). */
export function computeDashboardKpis(missions: readonly Mission[], month: string): DashboardKpis {
  const inMonth = missions.filter((mission) => mission.scheduledDate.startsWith(month));
  const booked = inMonth.filter((mission) => BOOKED_STATUSES.includes(mission.status));
  const revenueHT = roundMoney(booked.reduce((total, mission) => total + mission.pricing.totals.ht, 0));
  const totalCost = booked.reduce((total, mission) => total + mission.pricing.costs.total, 0);
  const totalMargin = booked.reduce((total, mission) => total + mission.pricing.margin.amount, 0);
  const convoyedKm = inMonth
    .filter((mission) => CONVOYED_STATUSES.includes(mission.status))
    .reduce((total, mission) => total + mission.route.distanceKm, 0);
  return {
    revenueHT,
    averageMarginRate: totalCost > 0 ? (totalMargin / totalCost) * 100 : null,
    averageMarginAmount: booked.length > 0 ? roundMoney(totalMargin / booked.length) : null,
    missionCount: inMonth.filter((mission) => mission.status !== "CANCELLED").length,
    convoyedKm: Math.round(convoyedKm),
  };
}
