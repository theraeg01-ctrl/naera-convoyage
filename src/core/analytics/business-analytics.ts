import type { CustomerMissionView } from "../access/projections";
import type { MissionStatus, VehicleInfo } from "../mission/types";
import { hasFeature, type Entitlements } from "../plans/features";
import { addDays } from "../shared/calendar";
import { roundMoney } from "../shared/money";

/**
 * Indicateurs d'un compte professionnel : SOURCE DE VÉRITÉ UNIQUE du
 * dashboard, des analytics et de la facturation pro. Calculés sur les
 * montants facturés au client (jamais sur les coûts Naera).
 *
 * Chaque indicateur appartient à un PÉRIMÈTRE explicite (période + statuts).
 * Les moyennes sont toujours calculées dans le périmètre de leur numérateur :
 *   dépense moyenne par mission = dépenses / nombre de missions du périmètre
 *   dépense moyenne par km      = dépenses / kilomètres du même périmètre
 * Aucun composant ne recalcule un indicateur.
 */

export const MISSION_PERIMETERS = ["REQUESTED", "CONFIRMED", "DELIVERED"] as const;
export type MissionPerimeter = (typeof MISSION_PERIMETERS)[number];

/** Statuts de chaque périmètre. */
export const PERIMETER_STATUSES: Record<MissionPerimeter, readonly MissionStatus[]> = {
  /** Demandes : toute mission non annulée, devis en attente compris. */
  REQUESTED: ["DRAFT", "QUOTED", "CONFIRMED", "ASSIGNED", "IN_PROGRESS", "DELIVERED", "COMPLETED"],
  /** Missions confirmées : engagées par le client, donc des dépenses (devis et annulations exclus). */
  CONFIRMED: ["CONFIRMED", "ASSIGNED", "IN_PROGRESS", "DELIVERED", "COMPLETED"],
  /** Livrées : véhicule remis au destinataire (livrée ou terminée). */
  DELIVERED: ["DELIVERED", "COMPLETED"],
};

/** Libellés sans ambiguïté, identiques sur tous les écrans pro. */
export const PERIMETER_LABELS: Record<MissionPerimeter, string> = {
  REQUESTED: "Demandes",
  CONFIRMED: "Missions confirmées",
  DELIVERED: "Livrées",
};

/** Indicateurs d'un périmètre sur un mois (date de prise en charge prévue). */
export interface MissionMetrics {
  perimeter: MissionPerimeter;
  /** « YYYY-MM ». */
  month: string;
  missionCount: number;
  /** Dépenses HT = somme des montants facturés HT du périmètre. */
  spendHT: number;
  spendTTC: number;
  /** Kilomètres des missions du périmètre (distance du trajet). */
  distanceKm: number;
  /** spendHT / missionCount (même périmètre). */
  averageSpendPerMission: number | null;
  /** spendHT / distanceKm (même périmètre). */
  averageSpendPerKm: number | null;
}

const inMonth = (mission: CustomerMissionView, month: string) => mission.scheduledDate.startsWith(month);

function metricsFor(
  missions: readonly CustomerMissionView[],
  month: string,
  perimeter: MissionPerimeter,
): MissionMetrics {
  const statuses = PERIMETER_STATUSES[perimeter];
  const selected = missions.filter((mission) => inMonth(mission, month) && statuses.includes(mission.status));
  const spendHT = roundMoney(selected.reduce((total, mission) => total + mission.totals.ht, 0));
  const spendTTC = roundMoney(selected.reduce((total, mission) => total + mission.totals.ttc, 0));
  const distanceKm = Math.round(selected.reduce((total, mission) => total + mission.route.distanceKm, 0));
  return {
    perimeter,
    month,
    missionCount: selected.length,
    spendHT,
    spendTTC,
    distanceKm,
    averageSpendPerMission: selected.length > 0 ? roundMoney(spendHT / selected.length) : null,
    averageSpendPerKm: distanceKm > 0 ? roundMoney(spendHT / distanceKm) : null,
  };
}

/** Demandes du mois (devis compris). Sert au volume, pas aux dépenses. */
export function getRequestedMissionMetrics(missions: readonly CustomerMissionView[], month: string): MissionMetrics {
  return metricsFor(missions, month, "REQUESTED");
}

/** Missions confirmées du mois : LE périmètre des dépenses. */
export function getConfirmedMissionMetrics(missions: readonly CustomerMissionView[], month: string): MissionMetrics {
  return metricsFor(missions, month, "CONFIRMED");
}

/** Missions livrées (ou terminées) du mois : kilomètres réellement convoyés. */
export function getDeliveredMissionMetrics(missions: readonly CustomerMissionView[], month: string): MissionMetrics {
  return metricsFor(missions, month, "DELIVERED");
}

/** Synthèse mensuelle d'un compte pro (dashboard, facturation, analytics). */
export interface BusinessMonthlyMetrics {
  month: string;
  requested: MissionMetrics;
  confirmed: MissionMetrics;
  delivered: MissionMetrics;
  /** Missions en cours maintenant (statut IN_PROGRESS, toutes dates). */
  inProgress: number;
  /** Devis en attente de confirmation (toutes dates). */
  toConfirm: number;
  /** Missions prévues aujourd'hui (non annulées). */
  today: number;
}

export function getBusinessMonthlyMetrics(
  missions: readonly CustomerMissionView[],
  today: string,
): BusinessMonthlyMetrics {
  const month = today.slice(0, 7);
  return {
    month,
    requested: getRequestedMissionMetrics(missions, month),
    confirmed: getConfirmedMissionMetrics(missions, month),
    delivered: getDeliveredMissionMetrics(missions, month),
    inProgress: missions.filter((mission) => mission.status === "IN_PROGRESS").length,
    toConfirm: missions.filter((mission) => mission.status === "QUOTED").length,
    today: missions.filter((mission) => mission.scheduledDate === today && mission.status !== "CANCELLED").length,
  };
}

export interface MonthlySpend {
  month: string;
  spendHT: number;
  missionCount: number;
}

/** Analytics standards : les indicateurs du mois (missions confirmées) et l'historique. */
export interface BasicAnalytics {
  /** Périmètre des quatre indicateurs : missions confirmées du mois. */
  current: MissionMetrics;
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

function computeBasic(missions: readonly CustomerMissionView[], today: string): BasicAnalytics {
  return {
    current: getConfirmedMissionMetrics(missions, today.slice(0, 7)),
    monthly: previousMonths(today, 6).map((month) => {
      const { spendHT, missionCount } = getConfirmedMissionMetrics(missions, month);
      return { month, spendHT, missionCount };
    }),
  };
}

function computeAdvanced(missions: readonly CustomerMissionView[]): AdvancedAnalytics {
  const confirmed = missions.filter((mission) => PERIMETER_STATUSES.CONFIRMED.includes(mission.status));
  const leadTimes = confirmed.map(
    (mission) => (Date.parse(`${mission.scheduledDate}T00:00:00Z`) - Date.parse(mission.createdAt)) / 86_400_000,
  );
  const positive = leadTimes.filter((days) => Number.isFinite(days) && days >= 0);
  return {
    averageLeadTimeDays:
      positive.length > 0 ? Math.round((positive.reduce((t, d) => t + d, 0) / positive.length) * 10) / 10 : null,
    spendByVehicleCategory: groupSpend(confirmed, (m) => m.vehicle.category).map(([category, value]) => ({
      category,
      ...value,
    })),
    spendByUser: groupSpend(confirmed, (m) => m.createdByUserId).map(([userId, value]) => ({ userId, ...value })),
  };
}

export function computeBusinessAnalytics(
  missions: readonly CustomerMissionView[],
  today: string,
  account: { entitlements: Entitlements },
): BusinessAnalytics {
  return {
    month: today.slice(0, 7),
    basic: hasFeature(account, "analytics_basic") ? computeBasic(missions, today) : null,
    advanced: hasFeature(account, "analytics_advanced") ? computeAdvanced(missions) : null,
  };
}
