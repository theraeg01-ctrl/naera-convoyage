import type { Mission, MissionStatus } from "../mission/types";
import { grossMarginRate } from "../pricing/margin";
import { roundMoney } from "../shared/money";

/** Missions engagées : comptées dans le chiffre d'affaires (hors brouillons, devis et annulations). */
export const BOOKED_STATUSES: readonly MissionStatus[] = [
  "CONFIRMED",
  "ASSIGNED",
  "IN_PROGRESS",
  "DELIVERED",
  "COMPLETED",
];

/**
 * Agrégats financiers Naera d'un ensemble de missions (back-office uniquement).
 * Un seul calcul, réutilisé par le dashboard, la finance et les listes de
 * comptes : le taux affiché est toujours le taux de marge SUR VENTE.
 *
 * Arrondis : les montants de chaque mission sont déjà au centime ; les sommes
 * sont seulement ramenées au centime pour neutraliser les erreurs de virgule
 * flottante (aucun arrondi à l'euro). Le taux est calculé sur ces totaux
 * exacts. Seul l'affichage peut arrondir (dashboard : à l'euro, finance : au
 * centime), toujours avec formatEuro, et un montant affiché n'est jamais
 * réutilisé dans un calcul.
 */
export interface FinanceTotals {
  /** Missions engagées prises en compte. */
  missions: number;
  /** Chiffre d'affaires = somme des prix de vente HT. */
  revenueHT: number;
  /** Somme des coûts internes. */
  internalCostHT: number;
  /** Marge brute = chiffre d'affaires HT − coût interne. */
  grossMarginHT: number;
  /** Taux de marge sur vente = marge brute / chiffre d'affaires HT (pondéré par le CA). */
  grossMarginRate: number | null;
}

export function financeTotals(missions: readonly Mission[]): FinanceTotals {
  const booked = missions.filter((mission) => BOOKED_STATUSES.includes(mission.status));
  const revenueHT = roundMoney(booked.reduce((total, mission) => total + mission.pricing.totals.ht, 0));
  const internalCostHT = roundMoney(booked.reduce((total, mission) => total + mission.pricing.costs.total, 0));
  return {
    missions: booked.length,
    revenueHT,
    internalCostHT,
    grossMarginHT: roundMoney(revenueHT - internalCostHT),
    grossMarginRate: grossMarginRate(revenueHT, internalCostHT),
  };
}
