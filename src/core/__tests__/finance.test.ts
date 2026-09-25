import { describe, expect, it } from "vitest";
import { financeTotals } from "../finance/finance-totals";
import { computeDashboardKpis } from "../mission/kpis";
import type { Mission, MissionStatus } from "../mission/types";
import { formatEuro } from "../shared/format";

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

describe("Arrondis financiers : calcul exact, arrondi à l'affichage seulement", () => {
  // Montants au centime dont la somme flottante brute n'est pas exacte (0,1 + 0,2…).
  const missions = [
    mission("CONFIRMED", 289.1, 197.82),
    mission("COMPLETED", 610.2, 402.47),
    mission("DELIVERED", 915.51, 1.2),
  ];
  const space = (text: string) => text.replace(/\s/g, " ");

  it("les totaux gardent les centimes (aucun arrondi à l'euro)", () => {
    const totals = financeTotals(missions);
    expect(totals.revenueHT).toBe(1814.81);
    expect(totals.internalCostHT).toBe(601.49);
    expect(totals.grossMarginHT).toBe(1213.32);
    // Marge = somme des marges de chaque mission, au centime près.
    const perMission = [289.1 - 197.82, 610.2 - 402.47, 915.51 - 1.2].reduce((total, value) => total + value, 0);
    expect(totals.grossMarginHT).toBeCloseTo(perMission, 10);
    expect(totals.grossMarginRate).toBeCloseTo((1213.32 / 1814.81) * 100, 10);
  });

  it("dashboard et finance lisent la même valeur exacte, seul le format change", () => {
    const kpis = computeDashboardKpis(missions, "2026-09");
    const totals = financeTotals(missions);
    expect(kpis.revenueHT).toBe(totals.revenueHT);
    expect(kpis.grossMarginHT).toBe(totals.grossMarginHT);
    expect(kpis.averageGrossMargin).toBe(totals.grossMarginHT / 3);
    expect(space(formatEuro(kpis.revenueHT, 0))).toBe("1 815 €"); // dashboard
    expect(space(formatEuro(totals.revenueHT, 2))).toBe("1 814,81 €"); // finance
  });
});
