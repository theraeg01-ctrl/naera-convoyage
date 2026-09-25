import { describe, expect, it } from "vitest";
import type { Actor } from "../access/actor";
import { allowedMissionActions } from "../access/mission-actions";
import { can, permissionsOf } from "../access/permissions";
import { findInternalFields } from "@/test/internal-fields";
import { toCustomerMissionView, toDriverMissionView } from "../access/projections";
import { isInScope, missionScopeFor } from "../access/scope";
import { getBusinessMonthlyMetrics } from "../analytics/business-analytics";
import { customerTracking } from "../mission/tracking";
import { DEFAULT_OWNERSHIP, type Mission } from "../mission/types";
import { activeNavItem, buildNavigation } from "../navigation/portal-navigation";
import { DEFAULT_PLAN_FEATURES, hasFeature, resolveEntitlements, type PlanCode } from "../plans/features";
import { defaultSelections, resolveSimulation } from "../simulation/resolve";
import { parisLilleSimulation, testSettings } from "./fixtures";

const staff: Actor = { kind: "STAFF", userId: "u-staff", name: "Camille", staffRole: "ADMIN" };
const dispatcher: Actor = { kind: "STAFF", userId: "u-disp", name: "Nora", staffRole: "DISPATCHER" };
const business = (role: "OWNER" | "MANAGER" | "OPERATOR" | "BILLING", businessAccountId = "biz-martin"): Actor => ({
  kind: "BUSINESS",
  userId: `u-${role}`,
  name: role,
  memberId: `m-${role}`,
  businessAccountId,
  businessName: "Garage Martin",
  role,
});
const personal: Actor = { kind: "PERSONAL", userId: "u-sophie", name: "Sophie", personalCustomerId: "pc-sophie" };
const driver: Actor = { kind: "DRIVER", userId: "u-karim", name: "Karim", driverProfileId: "drv-karim" };

function buildMission(patch: Partial<Mission> = {}): Mission {
  const simulation = parisLilleSimulation();
  const resolved = resolveSimulation(simulation, defaultSelections(simulation), testSettings());
  if (!resolved) throw new Error("fixture");
  return {
    id: "mission-1",
    reference: "NAE-CV-2026-0001",
    status: "IN_PROGRESS",
    isDemo: true,
    createdAt: "2026-09-20T08:00:00.000Z",
    updatedAt: "2026-09-20T08:00:00.000Z",
    scheduledDate: "2026-09-24",
    scheduledTime: "09:00",
    pickup: simulation.pickup,
    dropoff: simulation.dropoff,
    customerSnapshot: { type: "PROFESSIONAL", companyName: "Garage Martin", phone: "03 20 00 00 00" },
    ownership: { ...DEFAULT_OWNERSHIP, channel: "PRO_PORTAL", businessAccountId: "biz-martin" },
    assignment: { driverProfileId: "drv-karim", driverName: "Karim Benali", status: "ACCEPTED", assignedAt: "x" },
    contacts: { pickup: { name: "Atelier", phone: "03 20 11 22 33" }, dropoff: null },
    vehicle: { category: "SEDAN", fuelType: "DIESEL", plate: "GH-482-TK" },
    request: simulation.request,
    strategy: "BALANCED",
    route: resolved.route,
    accessLeg: resolved.access.selected,
    returnLeg: resolved.return.selected,
    returnAlternatives: resolved.return.ranked.map((entry) => entry.option),
    pricing: resolved.pricing,
    dataMode: "DEMO",
    progress: { startedAt: "a", inspectedAt: "b" },
    events: [{ id: "e1", type: "CREATED", label: "Mission créée", at: "2026-09-20T08:00:00.000Z" }],
    notes: "Clés à l'accueil",
    internalNotes: "Client exigeant sur les délais",
    ...patch,
  };
}

function deepKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((item) => deepKeys(item, keys));
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      deepKeys(child, keys);
    }
  }
  return keys;
}

const INTERNAL_KEYS = [
  "costs",
  "margin",
  "profitability",
  "targetPrice",
  "minimumPrice",
  "basePrice",
  "pricing",
  "fuel",
  "duration",
  "accessLeg",
  "returnLeg",
  "returnAlternatives",
  "price",
  "marginPolicy",
  "package",
  "request",
];

describe("Permissions par rôle", () => {
  it("Naera administrateur a tout, l'exploitation n'a ni finance ni paramètres", () => {
    expect(can(staff, "pricing.internal")).toBe(true);
    expect(can(staff, "settings.manage")).toBe(true);
    expect(can(dispatcher, "pricing.internal")).toBe(true);
    expect(can(dispatcher, "finance.read")).toBe(false);
    expect(can(dispatcher, "settings.manage")).toBe(false);
  });

  it("rôles entreprise : OWNER, MANAGER, OPERATOR, BILLING", () => {
    expect(can(business("OWNER"), "team.manage")).toBe(true);
    expect(can(business("MANAGER"), "team.manage")).toBe(false);
    expect(can(business("MANAGER"), "team.read")).toBe(true);
    expect(can(business("OPERATOR"), "missions.create")).toBe(true);
    expect(can(business("OPERATOR"), "billing.read")).toBe(false);
    expect(can(business("BILLING"), "billing.read")).toBe(true);
    expect(can(business("BILLING"), "missions.create")).toBe(false);
  });

  it("aucun client ni convoyeur ne voit les coûts internes", () => {
    for (const actor of [business("OWNER"), personal, driver]) {
      expect(can(actor, "pricing.internal")).toBe(false);
      expect(can(actor, "finance.read")).toBe(false);
      expect(permissionsOf(actor).has("missions.manage")).toBe(false);
    }
  });
});

describe("Isolation des données (multi-tenant)", () => {
  const mission = buildMission();

  it("une entreprise ne voit que ses missions", () => {
    expect(isInScope(mission, missionScopeFor(business("OWNER", "biz-martin")))).toBe(true);
    expect(isInScope(mission, missionScopeFor(business("OWNER", "biz-locauto")))).toBe(false);
  });

  it("un particulier ne voit que ses commandes", () => {
    expect(isInScope(mission, missionScopeFor(personal))).toBe(false);
    const own = buildMission({ ownership: { ...DEFAULT_OWNERSHIP, personalCustomerId: "pc-sophie" } });
    expect(isInScope(own, missionScopeFor(personal))).toBe(true);
  });

  it("un convoyeur ne voit que les missions qui lui sont affectées", () => {
    expect(isInScope(mission, missionScopeFor(driver))).toBe(true);
    const other: Actor = { kind: "DRIVER", userId: "u-julie", name: "Julie", driverProfileId: "drv-julie" };
    expect(isInScope(mission, missionScopeFor(other))).toBe(false);
    const declined = buildMission({ assignment: { ...mission.assignment!, status: "DECLINED" } });
    expect(isInScope(declined, missionScopeFor(driver))).toBe(false);
  });

  it("Naera voit tout", () => {
    expect(isInScope(mission, missionScopeFor(staff))).toBe(true);
  });
});

describe("Vues par audience : aucune donnée de rentabilité exposée", () => {
  const mission = buildMission();

  it("la vue client ne contient ni coût, ni marge, ni transport convoyeur", () => {
    const view = toCustomerMissionView(mission);
    const keys = deepKeys(view);
    for (const key of INTERNAL_KEYS) expect(keys.has(key), key).toBe(false);
    expect(view.totals.ht).toBe(mission.pricing.totals.ht);
    const json = JSON.stringify(view);
    expect(json).not.toContain(String(mission.pricing.costs.total));
    expect(json).not.toContain("Karim Benali");
    expect(view.driverFirstName).toBe("Karim");
  });

  it("l'historique client ne nomme pas le convoyeur et masque les notes internes", () => {
    const view = toCustomerMissionView(
      buildMission({
        events: [
          { id: "e1", type: "CREATED", label: "Mission créée", at: "2026-09-20T08:00:00.000Z" },
          {
            id: "e2",
            type: "STATUS_CHANGED",
            label: "Convoyeur affecté : Karim Benali",
            at: "2026-09-20T09:00:00.000Z",
          },
          { id: "e3", type: "NOTE", label: "Marge à renégocier", at: "2026-09-20T10:00:00.000Z" },
        ],
      }),
    );
    expect(view.events.map((event) => event.label)).toEqual(["Mission créée", "Convoyeur affecté"]);
  });

  it("aucune vue externe ne contient la note interne Naera", () => {
    for (const view of [toCustomerMissionView(mission), toDriverMissionView(mission)]) {
      expect(findInternalFields(view)).toEqual([]);
      expect(JSON.stringify(view)).not.toContain("Client exigeant");
    }
    expect(toCustomerMissionView(mission).instructions).toBe("Clés à l'accueil");
    expect(toDriverMissionView(mission).instructions).toBe("Clés à l'accueil");
  });

  it("la vue convoyeur ne contient aucun montant", () => {
    const view = toDriverMissionView(mission);
    const keys = deepKeys(view);
    for (const key of [
      ...INTERNAL_KEYS.filter((key) => key !== "accessLeg" && key !== "returnLeg"),
      "totals",
      "lines",
    ]) {
      expect(keys.has(key), key).toBe(false);
    }
    expect(view.returnLeg?.mode).toBe("TRAIN");
    expect(view.pickup.contact?.phone).toBe("03 20 11 22 33");
  });
});

describe("Actions autorisées par acteur", () => {
  it("le convoyeur fait avancer le terrain uniquement", () => {
    expect(allowedMissionActions(driver, { status: "IN_PROGRESS", progress: { inspectedAt: "x" } })).toEqual([
      "START_DRIVING",
    ]);
    expect(allowedMissionActions(driver, { status: "DRAFT", progress: {} })).toEqual([]);
    expect(allowedMissionActions(driver, { status: "DELIVERED", progress: { deliveredAt: "x" } })).toEqual([]);
  });

  it("le client accepte un devis, rien d'autre", () => {
    expect(allowedMissionActions(business("OPERATOR"), { status: "QUOTED", progress: {} })).toEqual(["CONFIRM"]);
    expect(allowedMissionActions(business("BILLING"), { status: "QUOTED", progress: {} })).toEqual([]);
    expect(allowedMissionActions(personal, { status: "CONFIRMED", progress: {} })).toEqual([]);
  });

  it("Naera pilote tout et peut annuler", () => {
    expect(allowedMissionActions(staff, { status: "CONFIRMED", progress: {} })).toEqual(["START", "CANCEL"]);
  });
});

describe("Plans et fonctionnalités", () => {
  const account = (planCode: PlanCode, status: "ACTIVE" | "CANCELED" = "ACTIVE") => ({
    entitlements: resolveEntitlements({ planCode, status, planFeatures: DEFAULT_PLAN_FEATURES[planCode] }),
  });

  it("hasFeature suit le plan", () => {
    expect(hasFeature(account("PRO_ESSENTIAL"), "analytics_basic")).toBe(false);
    expect(hasFeature(account("PRO_PLUS"), "analytics_basic")).toBe(true);
    expect(hasFeature(account("PRO_PLUS"), "analytics_advanced")).toBe(false);
    expect(hasFeature(account("ENTERPRISE"), "api_access")).toBe(true);
    expect(hasFeature(null, "csv_export")).toBe(false);
  });

  it("un abonnement résilié ne donne plus accès aux fonctionnalités", () => {
    expect(hasFeature(account("ENTERPRISE", "CANCELED"), "analytics_basic")).toBe(false);
  });

  it("les dérogations par compte s'appliquent", () => {
    const entitlements = resolveEntitlements({
      planCode: "PRO_PLUS",
      status: "ACTIVE",
      planFeatures: DEFAULT_PLAN_FEATURES.PRO_PLUS,
      overrides: [
        { feature: "api_access", enabled: true },
        { feature: "csv_export", enabled: false },
      ],
    });
    expect(hasFeature({ entitlements }, "api_access")).toBe(true);
    expect(hasFeature({ entitlements }, "csv_export")).toBe(false);
  });
});

describe("Navigation par portail", () => {
  const plus = {
    entitlements: resolveEntitlements({
      planCode: "PRO_PLUS",
      status: "ACTIVE",
      planFeatures: DEFAULT_PLAN_FEATURES.PRO_PLUS,
    }),
  };
  const essential = {
    entitlements: resolveEntitlements({ planCode: "PRO_ESSENTIAL", status: "ACTIVE", planFeatures: [] }),
  };
  const ids = (items: { id: string }[]) => items.map((item) => item.id);

  it("OWNER Pro Plus : toutes les sections", () => {
    expect(ids(buildNavigation("pro", business("OWNER"), plus))).toEqual([
      "dashboard",
      "missions",
      "new",
      "billing",
      "analytics",
      "team",
      "account",
    ]);
  });

  it("Analytics et Équipe dépendent du plan", () => {
    expect(ids(buildNavigation("pro", business("OWNER"), essential))).toEqual([
      "dashboard",
      "missions",
      "new",
      "billing",
      "account",
    ]);
  });

  it("…et du rôle", () => {
    expect(ids(buildNavigation("pro", business("OPERATOR"), plus))).toEqual([
      "dashboard",
      "missions",
      "new",
      "account",
    ]);
    expect(ids(buildNavigation("pro", business("BILLING"), plus))).toEqual([
      "dashboard",
      "missions",
      "billing",
      "analytics",
      "account",
    ]);
  });

  it("portails particulier, convoyeur et Naera", () => {
    expect(ids(buildNavigation("client", personal, null))).toEqual(["home", "order", "missions", "account"]);
    expect(ids(buildNavigation("driver", driver, null))).toEqual(["missions", "account"]);
    expect(ids(buildNavigation("admin", dispatcher, null))).not.toContain("finance");
    expect(ids(buildNavigation("admin", staff, null))).toContain("settings");
  });

  it("élément actif : le lien le plus spécifique", () => {
    const items = buildNavigation("pro", business("OWNER"), plus);
    expect(activeNavItem(items, "/pro/missions/new")?.id).toBe("new");
    expect(activeNavItem(items, "/pro/missions/abc")?.id).toBe("missions");
    expect(activeNavItem(items, "/pro")?.id).toBe("dashboard");
  });
});

describe("Dashboard professionnel et suivi client", () => {
  it("indicateurs pro sans aucune donnée de marge", () => {
    const view = (status: Mission["status"], scheduledDate: string) =>
      toCustomerMissionView(buildMission({ status, scheduledDate }));
    const missions = [
      view("COMPLETED", "2026-09-02"),
      view("COMPLETED", "2026-09-10"),
      view("IN_PROGRESS", "2026-09-24"),
      view("QUOTED", "2026-09-26"),
      view("CANCELLED", "2026-09-24"),
      view("COMPLETED", "2026-08-28"),
    ];
    const metrics = getBusinessMonthlyMetrics(missions, "2026-09-24");
    expect(metrics).toMatchObject({ today: 1, inProgress: 1, toConfirm: 1 });
    expect(metrics.requested.missionCount).toBe(4);
    expect(metrics.confirmed.missionCount).toBe(3);
    expect(metrics.delivered.missionCount).toBe(2);
    expect(metrics.delivered.distanceKm).toBe(440);
    expect(metrics.confirmed.spendHT).toBe(missions[0].totals.ht * 3);
    expect(findInternalFields(metrics)).toEqual([]);
  });

  it("suivi client en 6 étapes", () => {
    const stages = customerTracking({ status: "IN_PROGRESS", progress: { inspectedAt: "x" }, createdAt: "y" });
    expect(stages.map((stage) => stage.state)).toEqual(["done", "done", "done", "current", "upcoming", "upcoming"]);
  });

  it("véhicule livré ≠ mission terminée", () => {
    const delivered = customerTracking({
      status: "DELIVERED",
      progress: { inspectedAt: "a", drivingAt: "b", deliveredAt: "c" },
      createdAt: "y",
    });
    expect(delivered.find((stage) => stage.id === "DELIVERED")?.state).toBe("done");
    expect(delivered.find((stage) => stage.id === "COMPLETED")).toMatchObject({
      state: "current",
      label: "Mission terminée",
    });
    const completed = customerTracking({
      status: "COMPLETED",
      progress: { inspectedAt: "a", drivingAt: "b", deliveredAt: "c", completedAt: "d" },
      createdAt: "y",
    });
    expect(completed.every((stage) => stage.state === "done")).toBe(true);
  });

  it("le convoyeur confirme la livraison, seul Naera clôture la mission", () => {
    const deliveredMission = buildMission({
      status: "DELIVERED",
      progress: { startedAt: "a", inspectedAt: "b", drivingAt: "c", deliveredAt: "d" },
    });
    expect(allowedMissionActions(driver, deliveredMission)).toEqual([]);
    expect(allowedMissionActions(staff, deliveredMission)).toContain("COMPLETE");
    const driving = buildMission({
      status: "IN_PROGRESS",
      progress: { startedAt: "a", inspectedAt: "b", drivingAt: "c" },
    });
    expect(allowedMissionActions(driver, driving)).toEqual(["CONFIRM_DELIVERY"]);
  });
});
