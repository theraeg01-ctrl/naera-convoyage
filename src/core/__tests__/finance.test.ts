import { describe, expect, it } from "vitest";
import { financeTotals } from "../finance/finance-totals";
import { computeDashboardKpis } from "../mission/kpis";
import type { Mission, MissionStatus } from "../mission/types";

function mission(status: MissionStatus, priceHT: number, internalCost: number, distanceKm = 100): Mission {
  return {
    status,
    scheduledDate: "2026-09-10",
    route: { distanceKm },
    pricing: { totals: { ht: priceHT }, costs: { total: internalCost } },
  } as unknown as Mission;
}

describe("Agrégats financiers Naera", () => {
  const missions = [
    mission("COMPLETED", 259, 198),
    mission("CONFIRMED", 300, 240),
    mission("QUOTED", 1000, 100), // devis : exclu du chiffre d'affaires
    mission("CANCELLED", 500, 50), // annulée : exclue
  ];

  it("marge brute = CA HT − coût interne, taux sur vente pondéré par le CA", () => {
    const totals = financeTotals(missions);
    expect(totals).toMatchObject({ missions: 2, revenueHT: 559, internalCostHT: 438, grossMarginHT: 121 });
    expect(totals.grossMarginRate).toBeCloseTo((121 / 559) * 100, 10);
    // Jamais le taux sur coût (121 / 438 ≈ 27,6 %).
    expect(totals.grossMarginRate).not.toBeCloseTo((121 / 438) * 100, 1);
  });

  it("le dashboard Naera réutilise le même calcul", () => {
    const kpis = computeDashboardKpis(missions, "2026-09");
    const totals = financeTotals(missions);
    expect(kpis.grossMarginHT).toBe(totals.grossMarginHT);
    expect(kpis.grossMarginRate).toBe(totals.grossMarginRate);
    expect(kpis.averageGrossMargin).toBe(60.5);
    expect(kpis.convoyedKm).toBe(100);
  });
});
