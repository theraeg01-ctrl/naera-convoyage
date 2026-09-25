import { describe, expect, it } from "vitest";
import type { CustomerMissionView } from "../access/projections";
import {
  computeBusinessAnalytics,
  getBusinessMonthlyMetrics,
  getConfirmedMissionMetrics,
  getDeliveredMissionMetrics,
  getRequestedMissionMetrics,
} from "../analytics/business-analytics";
import type { MissionStatus } from "../mission/types";
import { resolveEntitlements } from "../plans/features";

let counter = 0;
function view(status: MissionStatus, scheduledDate: string, ht: number, distanceKm: number): CustomerMissionView {
  counter += 1;
  return {
    id: `m${counter}`,
    status,
    scheduledDate,
    createdAt: "2026-08-01T08:00:00.000Z",
    totals: { ht, vatPercent: 20, vat: ht * 0.2, ttc: ht * 1.2 },
    route: { distanceKm, durationMin: 60 },
    vehicle: { category: "SEDAN", fuelType: "DIESEL" },
    createdByUserId: "u1",
  } as unknown as CustomerMissionView;
}

// Septembre : 8 terminées/livrées, 3 en cours, 1 devis, 1 annulée ; plus août.
const missions: CustomerMissionView[] = [
  ...Array.from({ length: 7 }, (_, i) => view("COMPLETED", `2026-09-0${i + 1}`, 250, 100)),
  view("DELIVERED", "2026-09-20", 300, 150),
  view("IN_PROGRESS", "2026-09-24", 260, 220),
  view("IN_PROGRESS", "2026-09-24", 240, 60),
  view("IN_PROGRESS", "2026-09-24", 229, 40),
  view("QUOTED", "2026-09-27", 400, 150),
  view("CANCELLED", "2026-09-15", 500, 300),
  view("COMPLETED", "2026-08-12", 270, 120),
];

describe("KPI professionnels : périmètres explicites", () => {
  it("volumes sans ambiguïté : demandes 12, confirmées 11, livrées 8, en cours 3", () => {
    const metrics = getBusinessMonthlyMetrics(missions, "2026-09-24");
    expect(metrics.requested.missionCount).toBe(12);
    expect(metrics.confirmed.missionCount).toBe(11);
    expect(metrics.delivered.missionCount).toBe(8);
    expect(metrics.inProgress).toBe(3);
    expect(metrics.toConfirm).toBe(1);
    expect(metrics.today).toBe(3);
  });

  it("dépense moyenne par mission = dépenses / missions du MÊME périmètre", () => {
    for (const metrics of [
      getConfirmedMissionMetrics(missions, "2026-09"),
      getDeliveredMissionMetrics(missions, "2026-09"),
      getRequestedMissionMetrics(missions, "2026-09"),
    ]) {
      expect(metrics.averageSpendPerMission).toBeCloseTo(metrics.spendHT / metrics.missionCount, 2);
    }
  });

  it("dépense moyenne par km = dépenses / kilomètres du MÊME périmètre", () => {
    const confirmed = getConfirmedMissionMetrics(missions, "2026-09");
    expect(confirmed.spendHT).toBe(7 * 250 + 300 + 260 + 240 + 229);
    expect(confirmed.distanceKm).toBe(7 * 100 + 150 + 220 + 60 + 40);
    expect(confirmed.averageSpendPerKm).toBeCloseTo(confirmed.spendHT / confirmed.distanceKm, 2);
    // Le cas incohérent d'origine : diviser les dépenses des confirmées par les km des seules livrées.
    const delivered = getDeliveredMissionMetrics(missions, "2026-09");
    expect(confirmed.averageSpendPerKm).not.toBeCloseTo(confirmed.spendHT / delivered.distanceKm, 2);
  });

  it("devis et annulations ne sont jamais des dépenses", () => {
    const confirmed = getConfirmedMissionMetrics(missions, "2026-09");
    const withoutQuoteAndCancel = missions.filter((m) => m.status !== "QUOTED" && m.status !== "CANCELLED");
    expect(getConfirmedMissionMetrics(withoutQuoteAndCancel, "2026-09").spendHT).toBe(confirmed.spendHT);
  });

  it("cohérence Dashboard / Analytics : mêmes dépenses, mêmes missions", () => {
    const dashboard = getBusinessMonthlyMetrics(missions, "2026-09-24");
    const account = {
      entitlements: resolveEntitlements({ planCode: "PRO_PLUS", status: "ACTIVE", planFeatures: ["analytics_basic"] }),
    };
    const analytics = computeBusinessAnalytics(missions, "2026-09-24", account);
    expect(analytics.basic?.current).toEqual(dashboard.confirmed);
    const september = analytics.basic?.monthly.find((entry) => entry.month === "2026-09");
    expect(september).toEqual({
      month: "2026-09",
      spendHT: dashboard.confirmed.spendHT,
      missionCount: dashboard.confirmed.missionCount,
    });
  });
});
