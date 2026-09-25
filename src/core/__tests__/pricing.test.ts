import { describe, expect, it } from "vitest";
import { calculateDriverCost, calculateFixedFees, calculateMissionCost, calculateVariableFees } from "../pricing/cost";
import { calculateMissionDuration } from "../pricing/duration";
import { calculateFuelCost, computeFuel } from "../pricing/fuel-calculator";
import {
  applyMargin,
  computeMargin,
  grossMarginRate,
  markupRate,
  minimumProfitablePrice,
  normalizeStoredMargin,
  priceForMarginRate,
} from "../pricing/margin";
import { describePricingDecision } from "../pricing/pricing-decision";
import { checkAppliedPrice, checkProfitability } from "../pricing/profitability";
import { computeVat } from "../pricing/vat";
import { DomainError } from "../shared/errors";
import { testSettings } from "./fixtures";

describe("FuelCalculator", () => {
  it("applique distance × consommation / 100 × prix", () => {
    expect(calculateFuelCost(100, 6.5, 2)).toBe(13);
    expect(calculateFuelCost(220, 6.5, 1.85)).toBe(26.46);
  });

  it("utilise 6,5 L/100 km par défaut et le prix paramétré", () => {
    const settings = testSettings();
    const fuel = computeFuel(220, "PETROL", settings.fuel);
    expect(fuel.consumptionPer100).toBe(6.5);
    expect(fuel.quantity).toBe(14.3);
    expect(fuel.unit).toBe("L");
    expect(fuel.cost).toBe(26.46);
  });

  it("gère le diesel, l'hybride (essence) et l'électrique (kWh)", () => {
    const settings = testSettings();
    expect(computeFuel(100, "DIESEL", settings.fuel).unitPrice).toBe(settings.fuel.dieselPrice);
    expect(computeFuel(100, "HYBRID", settings.fuel).unitPrice).toBe(settings.fuel.petrolPrice);
    const electric = computeFuel(100, "ELECTRIC", settings.fuel);
    expect(electric.unit).toBe("kWh");
    expect(electric.cost).toBe(8.1);
  });

  it("respecte une consommation personnalisée", () => {
    expect(computeFuel(100, "PETROL", testSettings().fuel, 8).cost).toBe(14.8);
  });

  it("refuse les valeurs négatives, NaN ou infinies", () => {
    expect(() => calculateFuelCost(-1, 6.5, 1.85)).toThrow(DomainError);
    expect(() => calculateFuelCost(Number.NaN, 6.5, 1.85)).toThrow(DomainError);
    expect(() => calculateFuelCost(100, Number.POSITIVE_INFINITY, 1.85)).toThrow(DomainError);
  });
});

describe("calculateMissionDuration", () => {
  it("additionne aller, formalités, inspection, conduite, livraison et retour", () => {
    const duration = calculateMissionDuration({ accessMin: 40, drivingMin: 150, returnMin: 75 }, testSettings().times);
    expect(duration).toMatchObject({
      departureFormalitiesMin: 15,
      inspectionMin: 15,
      deliveryFormalitiesMin: 15,
      waitingMin: 0,
      totalMin: 310,
    });
  });

  it("intègre l'attente prévue et les temps configurés", () => {
    const times = { departureFormalitiesMin: 10, inspectionMin: 20, deliveryFormalitiesMin: 5 };
    expect(
      calculateMissionDuration({ accessMin: 0, drivingMin: 60, returnMin: 0, waitingMin: 30 }, times).totalMin,
    ).toBe(125);
  });

  it("refuse une durée invalide", () => {
    expect(() =>
      calculateMissionDuration({ accessMin: -5, drivingMin: 60, returnMin: 0 }, testSettings().times),
    ).toThrow(DomainError);
    expect(() =>
      calculateMissionDuration(
        { accessMin: 0, drivingMin: Number.POSITIVE_INFINITY, returnMin: 0 },
        testSettings().times,
      ),
    ).toThrow(DomainError);
  });
});

describe("calculateMissionCost", () => {
  it("calcule le coût convoyeur au taux horaire", () => {
    expect(calculateDriverCost(310, 18)).toBe(93);
    expect(calculateDriverCost(90, 18)).toBe(27);
  });

  it("calcule les frais fixes (15 €) et variables (0,05 €/km)", () => {
    const settings = testSettings();
    expect(calculateFixedFees(settings.pricing.fixedFees)).toBe(15);
    expect(calculateVariableFees(220, settings.pricing.variableFeePerKm)).toBe(11);
  });

  it("additionne toutes les composantes", () => {
    const cost = calculateMissionCost({
      driver: 93,
      access: 4.3,
      fuel: 30.03,
      tolls: 18,
      return: 32,
      fixedFees: 15,
      variableFees: 11,
      options: 0,
      other: 0,
    });
    expect(cost.total).toBe(203.33);
  });

  it("refuse un coût négatif", () => {
    expect(() =>
      calculateMissionCost({
        driver: 10,
        access: 0,
        fuel: -1,
        tolls: 0,
        return: 0,
        fixedFees: 0,
        variableFees: 0,
        options: 0,
        other: 0,
      }),
    ).toThrow(DomainError);
  });
});

describe("TVA", () => {
  it("calcule TVA et TTC au centime", () => {
    expect(computeVat(279, 20)).toEqual({ ht: 279, vatPercent: 20, vat: 55.8, ttc: 334.8 });
    expect(computeVat(99.99, 20)).toEqual({ ht: 99.99, vatPercent: 20, vat: 20, ttc: 119.99 });
    expect(computeVat(100, 0).ttc).toBe(100);
  });

  it("refuse un montant invalide", () => {
    expect(() => computeVat(Number.NaN, 20)).toThrow(DomainError);
  });
});

describe("Marge : définitions uniques", () => {
  it("marge brute, taux de marge sur vente et majoration sur coût (259 € / 198 €)", () => {
    const margin = computeMargin(259, 198);
    expect(margin.grossMargin).toBe(61);
    expect(margin.grossMarginRate).toBeCloseTo(23.55, 2);
    expect(margin.markupRate).toBeCloseTo(30.81, 2);
    expect(grossMarginRate(259, 198)).toBeCloseTo((61 / 259) * 100, 10);
    expect(markupRate(259, 198)).toBeCloseTo((61 / 198) * 100, 10);
  });

  it("une marge cible de 30 % se calcule sur le prix de vente : prix = coût / (1 − 30 %)", () => {
    expect(priceForMarginRate(198, 30)).toBe(282.86);
    expect(applyMargin(198, { mode: "PERCENT", percent: 30 })).toBe(282.86);
    expect(grossMarginRate(282.86, 198)).toBeCloseTo(30, 2);
  });

  it("une marge de 30 % n'est PAS une majoration de 30 %", () => {
    const withMargin = applyMargin(200, { mode: "PERCENT", percent: 30 });
    const withMarkup = 200 * 1.3;
    expect(withMargin).toBe(285.71);
    expect(withMargin).not.toBe(withMarkup);
    // Majorer le coût de 30 % ne donne que 23,08 % de marge sur vente…
    expect(grossMarginRate(withMarkup, 200)).toBeCloseTo(23.08, 2);
    // … alors qu'une marge de 30 % correspond à une majoration de 42,86 %.
    expect(markupRate(withMargin, 200)).toBeCloseTo(42.86, 1);
  });

  it("marge brute fixe : ajoutée au coût interne", () => {
    expect(applyMargin(200, { mode: "FIXED", amount: 80 })).toBe(280);
  });

  it("prix minimum rentable : taux minimum sur vente, arrondi à l'euro supérieur", () => {
    expect(minimumProfitablePrice(200, 10)).toBe(223); // 222,22 → 223
    expect(minimumProfitablePrice(203.33, 10)).toBe(226); // 225,92 → 226
    expect(grossMarginRate(minimumProfitablePrice(203.33, 10), 203.33)!).toBeGreaterThanOrEqual(10);
    expect(minimumProfitablePrice(198, 30)).toBe(283);
  });

  it("refuse un taux de marge sur vente de 100 % ou plus", () => {
    expect(() => priceForMarginRate(100, 100)).toThrow(DomainError);
    expect(() => applyMargin(100, { mode: "PERCENT", percent: 120 })).toThrow(DomainError);
    expect(() => minimumProfitablePrice(100, 96)).toThrow(DomainError);
  });

  it("évite toute division par zéro", () => {
    expect(computeMargin(0, 0)).toEqual({ grossMargin: 0, grossMarginRate: null, markupRate: null });
  });

  it("relit les anciens tarifs enregistrés (taux recalculés sur le prix de vente)", () => {
    const legacy = { amount: 61, rateOnCost: 30.8, rateOnPrice: 23.55 };
    const margin = normalizeStoredMargin(legacy, 259, 198);
    expect(margin.grossMargin).toBe(61);
    expect(margin.grossMarginRate).toBeCloseTo(23.55, 2);
    expect(margin).not.toHaveProperty("rateOnCost");
  });
});

describe("Contrôle de rentabilité", () => {
  it("package rentable si au-dessus du prix cible", () => {
    const check = checkProfitability({ packagePrice: 349, targetPrice: 300, minimumPrice: 260 });
    expect(check.status).toBe("PROFITABLE");
    expect(check.packageIsRecommended).toBe(true);
  });

  it("package sous la marge cible mais au-dessus du minimum", () => {
    const check = checkProfitability({ packagePrice: 249, targetPrice: 264.33, minimumPrice: 224 });
    expect(check.status).toBe("BELOW_TARGET");
    expect(check.packageIsRecommended).toBe(false);
  });

  it("package insuffisant sous le prix minimum", () => {
    const check = checkProfitability({ packagePrice: 149, targetPrice: 196, minimumPrice: 166 });
    expect(check.status).toBe("INSUFFICIENT");
    expect(check.message).toBe("Forfait catalogue sous le prix minimum rentable");
  });
});

describe("Forfait catalogue ≠ prix final appliqué", () => {
  const service = { id: "SERVICE", label: "Convoyage — tarif sur mesure", amount: 283, kind: "SERVICE" as const };
  // Coût interne 198 €, marge cible 30 % sur vente → 282,86 € ; marge minimum 10 % → 220 €.
  const adjusted = {
    package: { id: "REGIONAL" as const, name: "Régional", price: 249 },
    profitability: checkProfitability({ packagePrice: 249, targetPrice: 282.86, minimumPrice: 220 }),
    basePrice: 283,
    targetPrice: 282.86,
    minimumPrice: 220,
    lines: [service],
  };

  it("forfait ajusté (orange) mais prix appliqué qui atteint la marge cible (vert)", () => {
    const decision = describePricingDecision(adjusted);
    expect(decision.package).toMatchObject({
      status: "BELOW_TARGET",
      adjusted: true,
      price: 249,
      title: "Forfait Régional ajusté",
      detail: "Ce forfait seul est inférieur à la marge cible.",
    });
    expect(decision.applied).toMatchObject({
      price: 283,
      status: "TARGET_REACHED",
      message: "Marge cible atteinte",
      excludesOptions: false,
    });
    // Le prix appliqué donne bien au moins 30 % de marge sur vente.
    expect(grossMarginRate(283, 198)!).toBeGreaterThanOrEqual(30);
  });

  it("forfait sous le prix minimum : ajusté, la mission reste rentable au prix appliqué", () => {
    const decision = describePricingDecision({
      ...adjusted,
      profitability: checkProfitability({ packagePrice: 149, targetPrice: 282.86, minimumPrice: 220 }),
      package: { id: "LOCAL_PLUS" as const, name: "Local+", price: 149 },
    });
    expect(decision.package.detail).toBe("Ce forfait seul est inférieur au prix minimum rentable.");
    expect(decision.applied.status).toBe("TARGET_REACHED");
  });

  it("forfait rentable : aucun ajustement, pas de second verdict trompeur", () => {
    const decision = describePricingDecision({
      ...adjusted,
      profitability: checkProfitability({ packagePrice: 349, targetPrice: 282.86, minimumPrice: 220 }),
      package: { id: "FRANCE" as const, name: "France", price: 349 },
      basePrice: 349,
    });
    expect(decision.package).toMatchObject({ adjusted: false, title: "Forfait France rentable" });
    expect(decision.applied.status).toBe("TARGET_REACHED");
  });

  it("le verdict du prix final dépend du prix appliqué, pas du forfait", () => {
    expect(checkAppliedPrice({ appliedPrice: 282.86, targetPrice: 282.86, minimumPrice: 220 })).toBe("TARGET_REACHED");
    expect(checkAppliedPrice({ appliedPrice: 260, targetPrice: 282.86, minimumPrice: 220 })).toBe("MINIMUM_REACHED");
    expect(checkAppliedPrice({ appliedPrice: 219, targetPrice: 282.86, minimumPrice: 220 })).toBe("BELOW_MINIMUM");
  });

  it("signale les options facturées en plus du prix de la prestation", () => {
    const option = { id: "PHOTO_REPORT", label: "Rapport photo", amount: 15, kind: "OPTION" as const };
    expect(describePricingDecision({ ...adjusted, lines: [service, option] }).applied.excludesOptions).toBe(true);
  });
});
