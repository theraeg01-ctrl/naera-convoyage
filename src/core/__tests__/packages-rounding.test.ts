import { describe, expect, it } from "vitest";
import { computeOptionLines } from "../pricing/options";
import { findPackage, resolvePackage } from "../pricing/packages";
import { commercialRounding } from "../pricing/rounding";
import { appSettingsSchema } from "../settings/schema";
import { DEFAULT_SETTINGS } from "../settings/defaults";
import { easterSunday, isWeekend, publicHolidayName } from "../shared/calendar";
import { DomainError } from "../shared/errors";
import { testSettings } from "./fixtures";

const tiers = DEFAULT_SETTINGS.packages;

describe("Packages", () => {
  it.each([
    [0, "CITY"],
    [50, "CITY"],
    [50.4, "CITY"],
    [51, "LOCAL_PLUS"],
    [150, "LOCAL_PLUS"],
    [151, "REGIONAL"],
    [300, "REGIONAL"],
    [301, "FRANCE"],
    [500, "FRANCE"],
    [501, "FRANCE_PLUS"],
    [800, "FRANCE_PLUS"],
    [801, "LONG_DISTANCE"],
    [1500, "LONG_DISTANCE"],
  ])("%s km → %s", (km, id) => {
    expect(findPackage(km, tiers).id).toBe(id);
  });

  it("applique les prix de la grille", () => {
    expect(resolvePackage(220, tiers, "EXACT").price).toBe(249);
    expect(resolvePackage(40, tiers, "EXACT").price).toBe(89);
  });

  it("Long Distance : 49 € + 0,65 €/km, arrondi commercial", () => {
    expect(resolvePackage(1000, tiers, "EXACT").price).toBe(699);
    expect(resolvePackage(801, tiers, "EXACT").price).toBe(569.65);
    expect(resolvePackage(801, tiers, "PSYCHOLOGICAL").price).toBe(579);
  });

  it("utilise la grille sauvegardée (valeurs configurables)", () => {
    const custom = testSettings((settings) => {
      settings.packages[2].basePrice = 279;
    });
    expect(resolvePackage(220, custom.packages, "EXACT").price).toBe(279);
  });

  it("refuse une distance négative", () => {
    expect(() => findPackage(-3, tiers)).toThrow(DomainError);
  });

  it("valide la grille : tranches contiguës, dernière sans limite", () => {
    expect(appSettingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true);
    const broken = testSettings((settings) => {
      settings.packages[1].minKm = 60;
    });
    expect(appSettingsSchema.safeParse(broken).success).toBe(false);
  });
});

describe("commercialRounding", () => {
  it("mode exact : arrondi au centime", () => {
    expect(commercialRounding(261.456, "EXACT")).toBe(261.46);
  });

  it("5 € et 10 € supérieurs", () => {
    expect(commercialRounding(261, "UP_5")).toBe(265);
    expect(commercialRounding(265, "UP_5")).toBe(265);
    expect(commercialRounding(261, "UP_10")).toBe(270);
    expect(commercialRounding(270, "UP_10")).toBe(270);
  });

  it.each([
    [210, 219],
    [241, 249],
    [262.6, 269],
    [269, 269],
    [290.01, 299],
    [64, 69],
    [569.65, 579],
  ])("prix psychologique : %s → %s", (value, expected) => {
    expect(commercialRounding(value, "PSYCHOLOGICAL")).toBe(expected);
  });

  it("ne produit jamais NaN ni un prix négatif", () => {
    expect(commercialRounding(0, "PSYCHOLOGICAL")).toBe(0);
    expect(() => commercialRounding(Number.NaN, "UP_5")).toThrow(DomainError);
    expect(() => commercialRounding(-10, "UP_10")).toThrow(DomainError);
  });
});

describe("Calendrier et majorations", () => {
  it("calcule Pâques", () => {
    expect(easterSunday(2024)).toBe("2024-03-31");
    expect(easterSunday(2025)).toBe("2025-04-20");
    expect(easterSunday(2026)).toBe("2026-04-05");
  });

  it("détecte week-ends et jours fériés", () => {
    expect(isWeekend("2026-09-26")).toBe(true);
    expect(isWeekend("2026-09-29")).toBe(false);
    expect(publicHolidayName("2026-07-14")).toBe("Fête nationale");
    expect(publicHolidayName("2026-05-25")).toBe("Lundi de Pentecôte");
    expect(publicHolidayName("2026-09-29")).toBeNull();
  });

  it("ajoute options, attente par tranche et majoration week-end", () => {
    const lines = computeOptionLines(
      269,
      { optionIds: ["PHOTO_INSPECTION", "KEY_HANDOVER"], waitingMin: 45, date: "2026-09-26" },
      DEFAULT_SETTINGS.options,
    );
    expect(lines.map((line) => [line.id, line.amount])).toEqual([
      ["PHOTO_INSPECTION", 25],
      ["KEY_HANDOVER", 15],
      ["WAITING", 30],
      ["WEEKEND", 53.8],
    ]);
  });

  it("le jour férié prime sur le week-end (pas de cumul)", () => {
    const lines = computeOptionLines(
      100,
      { optionIds: [], waitingMin: 0, date: "2026-11-01" },
      DEFAULT_SETTINGS.options,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ id: "HOLIDAY", amount: 30 });
  });
});
