import { describe, expect, it } from "vitest";
import { calculateDriverCost, calculateFixedFees, calculateMissionCost, calculateVariableFees } from "../pricing/cost";
import { calculateMissionDuration } from "../pricing/duration";
import { calculateFuelCost, computeFuel } from "../pricing/fuel-calculator";
import { applyMargin, computeMargin, minimumProfitablePrice } from "../pricing/margin";
import { checkProfitability } from "../pricing/profitability";
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

describe("Marge", () => {
  it("applique un pourcentage sur le coût", () => {
    expect(applyMargin(200, { mode: "PERCENT", percent: 30 })).toBe(260);
  });

  it("applique un montant fixe", () => {
    expect(applyMargin(200, { mode: "FIXED", amount: 80 })).toBe(280);
  });

  it("calcule le prix minimum rentable arrondi à l'euro supérieur", () => {
    expect(minimumProfitablePrice(203.33, 10)).toBe(224);
    expect(minimumProfitablePrice(200, 10)).toBe(220);
  });

  it("calcule marge €, taux de marge et taux de marque", () => {
    const margin = computeMargin(279, 186);
    expect(margin.amount).toBe(93);
    expect(margin.rateOnCost).toBeCloseTo(50);
    expect(margin.rateOnPrice).toBeCloseTo(33.33, 2);
  });

  it("évite toute division par zéro", () => {
    expect(computeMargin(0, 0)).toEqual({ amount: 0, rateOnCost: null, rateOnPrice: null });
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
    expect(check.message).toBe("Tarif package insuffisant pour cette mission");
  });
});
