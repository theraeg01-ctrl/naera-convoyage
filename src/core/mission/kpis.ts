import { financeTotals, type FinanceTotals } from "../finance/finance-totals";
import { roundMoney } from "../shared/money";
import type { Mission, MissionStatus } from "./types";

const CONVOYED_STATUSES: readonly MissionStatus[] = ["DELIVERED", "COMPLETED"];

/** Indicateurs de pilotage Naera du mois (back-office uniquement). */
export interface DashboardKpis extends FinanceTotals {
  /** Marge brute moyenne par mission engagée. */
  averageGrossMargin: number | null;
  /** Kilomètres des missions livrées ou terminées du mois. */
  convoyedKm: number;
}

/** Indicateurs du mois (month = « YYYY-MM »). */
export function computeDashboardKpis(missions: readonly Mission[], month: string): DashboardKpis {
  const inMonth = missions.filter((mission) => mission.scheduledDate.startsWith(month));
  const totals = financeTotals(inMonth);
  const convoyedKm = inMonth
    .filter((mission) => CONVOYED_STATUSES.includes(mission.status))
    .reduce((total, mission) => total + mission.route.distanceKm, 0);
  return {
    ...totals,
    averageGrossMargin: totals.missions > 0 ? roundMoney(totals.grossMarginHT / totals.missions) : null,
    convoyedKm: Math.round(convoyedKm),
  };
}
