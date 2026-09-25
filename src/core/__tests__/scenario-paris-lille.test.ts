import { describe, expect, it } from "vitest";
import { computeMissionPricing } from "../pricing/mission-pricing";
import { DomainError } from "../shared/errors";
import { defaultSelections, resolveSimulation } from "../simulation/resolve";
import { parisLilleSimulation, testSettings } from "./fixtures";

/**
 * Scénario principal : Paris → Lille, 220 km, 2 h 30, 18 € de péages,
 * carburant ≈ 30 €, train retour 32 € / 1 h 15, 18 €/h, marge cible 30 % du prix
 * de vente, marge minimum 10 % du prix de vente.
 */
const settings = testSettings((draft) => {
  draft.fuel.petrolPrice = 2.1; // 14,3 L × 2,10 € ≈ 30 €
});

const baseInput = {
  route: { distanceKm: 220, drivingMin: 150, tollsEur: 18 },
  vehicle: { fuelType: "PETROL" as const },
  access: { cost: 4.3, durationMin: 40 },
  return: { cost: 32, durationMin: 75 },
  date: "2026-09-29",
  waitingMin: 0,
  optionIds: [],
};

describe("Scénario Paris → Lille", () => {
  const pricing = computeMissionPricing(baseInput, settings);

  it("calcule le temps et le coût convoyeur", () => {
    expect(pricing.duration.totalMin).toBe(310);
    expect(pricing.costs.driver).toBe(93);
  });

  it("calcule carburant, péages, retour et frais", () => {
    expect(pricing.fuel.cost).toBe(30.03);
    expect(pricing.costs).toMatchObject({
      access: 4.3,
      fuel: 30.03,
      tolls: 18,
      return: 32,
      fixedFees: 15,
      variableFees: 11,
    });
    expect(pricing.costs.total).toBe(203.33);
  });

  it("compare package, coût interne et prix minimum (taux sur prix de vente)", () => {
    expect(pricing.package).toMatchObject({ id: "REGIONAL", price: 249 });
    expect(pricing.targetPrice).toBe(290.47); // 203,33 / 0,70
    expect(pricing.minimumPrice).toBe(226); // 203,33 / 0,90 = 225,92 → 226
    expect(pricing.marginTargets).toEqual({ targetRatePercent: 30, minimumRatePercent: 10 });
    expect(pricing.profitability.status).toBe("BELOW_TARGET");
  });

  it("propose un prix conseillé arrondi, avec TVA et marge brute", () => {
    expect(pricing.basePrice).toBe(299);
    expect(pricing.totals).toEqual({ ht: 299, vatPercent: 20, vat: 59.8, ttc: 358.8 });
    expect(pricing.margin.grossMargin).toBe(95.67);
    // Le prix arrondi atteint au moins la marge cible de 30 % sur vente.
    expect(pricing.margin.grossMarginRate!).toBeGreaterThanOrEqual(30);
    expect(pricing.margin.grossMarginRate).toBeCloseTo(32, 0);
    expect(pricing.margin.markupRate).toBeCloseTo(47.05, 1);
  });

  it("garde le package quand il est rentable (marge fixe faible)", () => {
    const lowMargin = computeMissionPricing({ ...baseInput, marginOverride: { mode: "FIXED", amount: 30 } }, settings);
    expect(lowMargin.profitability.status).toBe("PROFITABLE");
    expect(lowMargin.basePrice).toBe(249);
    expect(lowMargin.lines[0].label).toContain("Regional");
  });

  it("n'accepte aucune donnée invalide", () => {
    expect(() =>
      computeMissionPricing({ ...baseInput, route: { ...baseInput.route, distanceKm: -220 } }, settings),
    ).toThrow(DomainError);
    expect(() =>
      computeMissionPricing({ ...baseInput, return: { cost: Number.NaN, durationMin: 75 } }, settings),
    ).toThrow(DomainError);
    expect(() =>
      computeMissionPricing(
        { ...baseInput, route: { ...baseInput.route, drivingMin: Number.POSITIVE_INFINITY } },
        settings,
      ),
    ).toThrow(DomainError);
  });
});

describe("Simulation complète Paris → Lille", () => {
  const simulation = parisLilleSimulation();

  it("recommande le train et reproduit le calcul", () => {
    const resolved = resolveSimulation(simulation, defaultSelections(simulation), settings);
    expect(resolved).not.toBeNull();
    expect(resolved?.return.selected?.mode).toBe("TRAIN");
    expect(resolved?.access.selected?.mode).toBe("PUBLIC_TRANSIT");
    expect(resolved?.pricing.totals.ht).toBe(299);
  });

  it("recalcule quand l'utilisateur choisit le VTC", () => {
    const resolved = resolveSimulation(
      simulation,
      { ...defaultSelections(simulation), returnOptionId: "ret-vtc" },
      settings,
    );
    expect(resolved?.return.selected?.mode).toBe("VTC");
    expect(resolved?.pricing.costs.return).toBe(189);
    expect(resolved?.pricing.totals.ht).toBeGreaterThan(299);
  });

  it("applique les corrections manuelles et les signale", () => {
    const resolved = resolveSimulation(
      simulation,
      { ...defaultSelections(simulation), overrides: { distanceKm: 230, returnPrice: 40 } },
      settings,
    );
    expect(resolved?.route.distanceKm).toBe(230);
    expect(resolved?.route.source).toBe("MANUAL");
    expect(resolved?.return.selected?.price).toBe(40);
    expect(resolved?.return.selected?.source).toBe("MANUAL");
  });

  it("produit au plus 3 recommandations, dont l'économie train vs VTC", () => {
    const resolved = resolveSimulation(simulation, defaultSelections(simulation), settings);
    const insights = resolved?.insights ?? [];
    expect(insights.length).toBeLessThanOrEqual(3);
    expect(insights[0].tone).toBe("warning");
    expect(insights.some((insight) => insight.title.includes("par rapport au VTC"))).toBe(true);
  });

  it("renvoie null sans itinéraire (saisie manuelle nécessaire)", () => {
    const withoutRoute = { ...simulation, routes: [] };
    expect(resolveSimulation(withoutRoute, defaultSelections(withoutRoute), settings)).toBeNull();
  });
});
