import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@/core/access/actor";
import { AccessDeniedError } from "@/core/access/permissions";
import { todayInZone } from "@/core/shared/timezone";

/**
 * Séparation des données de bout en bout, sur le vrai jeu de démonstration
 * (stockage local temporaire) : périmètres, projections, rôles et plans.
 */

let directory: string;
let actors: Actor[];
let services: {
  pro: typeof import("../portals/pro-portal");
  client: typeof import("../portals/client-portal");
  driver: typeof import("../portals/driver-portal");
  admin: typeof import("../portals/admin-portal");
  orders: typeof import("../portals/orders");
  container: typeof import("../container");
};

/** Clés qui n'existent que dans les données internes Naera. */
const INTERNAL_MARKERS = [
  '"costs"',
  '"margin',
  "profitability",
  "hourlyDriverCost",
  "internalCost",
  "returnAlternatives",
  '"pricing"',
  '"price"',
  "costTotal",
];

function find(name: string, kind?: Actor["kind"]): Actor {
  const actor = actors.find((candidate) => candidate.name === name && (!kind || candidate.kind === kind));
  if (!actor) throw new Error(`Profil introuvable : ${name}`);
  return actor;
}

async function denied(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    if (error instanceof AccessDeniedError) return error.reason;
    throw error;
  }
}

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "naera-access-"));
  process.env.LOCAL_DATA_DIR = directory;
  delete process.env.DATABASE_URL;
  services = {
    pro: await import("../portals/pro-portal"),
    client: await import("../portals/client-portal"),
    driver: await import("../portals/driver-portal"),
    admin: await import("../portals/admin-portal"),
    orders: await import("../portals/orders"),
    container: await import("../container"),
  };
  const repositories = await services.container.getAppRepositories();
  actors = await repositories.directory.listActors();
}, 120_000);

afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("jeu de démonstration", () => {
  it("Garage Martin : 12 missions ce mois (8 terminées, 3 en cours, 1 à confirmer)", async () => {
    const julien = find("Julien Martin");
    const dashboard = await services.pro.getProDashboard(julien);
    expect(dashboard.kpis.missionsThisMonth).toBe(12);
    expect(dashboard.kpis.completedThisMonth).toBe(8);
    expect(dashboard.kpis.inProgress).toBe(3);
    expect(dashboard.kpis.toConfirm).toBe(1);
  });

  it("Sophie Durand a une commande en cours", async () => {
    const home = await services.client.getClientHome(find("Sophie Durand"));
    expect(home.current?.status).toBe("IN_PROGRESS");
  });
});

describe("isolation multi-tenant", () => {
  it("un professionnel ne voit que les missions de son entreprise", async () => {
    const julien = find("Julien Martin");
    const thomas = find("Thomas Lefèvre");
    const [martin, locauto] = await Promise.all([
      services.pro.listProMissions(julien, { filter: "ALL" }),
      services.pro.listProMissions(thomas, { filter: "ALL" }),
    ]);
    expect(martin.missions.length).toBeGreaterThan(12);
    expect(locauto.missions).toHaveLength(3);
    const martinIds = new Set(martin.missions.map((mission) => mission.id));
    expect(locauto.missions.some((mission) => martinIds.has(mission.id))).toBe(false);
  });

  it("une mission d'une autre entreprise est introuvable, même avec son identifiant", async () => {
    const julien = find("Julien Martin");
    const thomas = find("Thomas Lefèvre");
    const [otherId] = (await services.pro.listProMissions(thomas, { filter: "ALL" })).missions.map((m) => m.id);
    expect(await services.pro.getProMission(julien, otherId)).toBeNull();
    const result = await services.orders.confirmQuotedMission(julien, otherId);
    expect(result.ok).toBe(false);
  });

  it("un particulier ne voit que ses commandes", async () => {
    const sophie = find("Sophie Durand");
    const missions = await services.client.listClientMissions(sophie);
    expect(missions).toHaveLength(2);
    const julien = find("Julien Martin");
    const [proMission] = (await services.pro.listProMissions(julien, { filter: "ALL" })).missions;
    expect(await services.client.getClientMission(sophie, proMission.id)).toBeNull();
  });

  it("un convoyeur ne voit que ses missions affectées", async () => {
    const marc = find("Marc Dubois");
    const list = await services.driver.listDriverMissions(marc);
    const all = [...list.current, ...list.upcoming, ...list.done];
    expect(all.length).toBeGreaterThan(0);
    const staff = find("Inès Moreau");
    const everything = await services.admin.listAdminMissions(staff);
    const notMine = everything.find(
      (mission) => mission.assignment?.driverProfileId !== (marc as { driverProfileId: string }).driverProfileId,
    );
    expect(notMine).toBeDefined();
    expect(await services.driver.getDriverMission(marc, notMine!.id)).toBeNull();
  });
});

describe("aucune donnée interne hors back-office", () => {
  it("vues pro, particulier et convoyeur sans coût, marge ni rémunération", async () => {
    const julien = find("Julien Martin");
    const sophie = find("Sophie Durand");
    const marc = find("Marc Dubois");
    const payloads: unknown[] = [
      await services.pro.getProDashboard(julien),
      await services.pro.listProMissions(julien, { filter: "ALL" }),
      await services.pro.getProBilling(julien),
      await services.pro.getProAnalytics(julien),
      await services.client.getClientHome(sophie),
      await services.client.listClientMissions(sophie),
      await services.driver.listDriverMissions(marc),
    ];
    const [firstPro] = (await services.pro.listProMissions(julien, { filter: "ALL" })).missions;
    payloads.push((await services.pro.getProMission(julien, firstPro.id))!);
    const [firstDriver] = (await services.driver.listDriverMissions(marc)).current;
    payloads.push((await services.driver.getDriverMission(marc, firstDriver.id))!);
    for (const payload of payloads) {
      const json = JSON.stringify(payload);
      for (const marker of INTERNAL_MARKERS) expect(json).not.toContain(marker);
    }
  });

  it("le devis client ne contient que des prix de vente", async () => {
    const sophie = find("Sophie Durand");
    const today = todayInZone();
    const result = await services.orders.quoteOrder(sophie, {
      pickupAddress: "Place de la Nation, 75011 Paris",
      dropoffAddress: "Rue Faidherbe, 59000 Lille",
      date: today,
      time: "23:30",
      vehicle: { category: "CITY", fuelType: "PETROL" },
    });
    expect(result.ok).toBe(true);
    const json = JSON.stringify(result);
    for (const marker of INTERNAL_MARKERS) expect(json).not.toContain(marker);
  });

  it("la vue Naera, elle, expose coûts et marge", async () => {
    const missions = await services.admin.listAdminMissions(find("Inès Moreau"));
    expect(missions[0].pricing.costs.total).toBeGreaterThan(0);
  });
});

describe("rôles et plans", () => {
  it("un opérateur n'accède pas à la facturation", async () => {
    expect(await denied(services.pro.getProBilling(find("Léa Petit")))).toBe("FORBIDDEN");
  });

  it("le rôle facturation ne peut pas commander", async () => {
    const result = await services.orders.placeOrder(find("Nadia Roux"), {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("Pro Essentiel : analytics et équipe refusés par le serveur", async () => {
    const thomas = find("Thomas Lefèvre");
    expect(await denied(services.pro.getProAnalytics(thomas))).toBe("FORBIDDEN");
    expect(await denied(services.pro.getProTeam(thomas))).toBe("FORBIDDEN");
  });

  it("l'exploitation Naera n'a pas accès à la finance", async () => {
    expect(await denied(services.admin.getFinanceOverview(find("Karim Haddad")))).toBe("FORBIDDEN");
  });

  it("un client ne peut pas utiliser les services du back-office", async () => {
    expect(await denied(services.admin.listAdminMissions(find("Sophie Durand")))).toBe("FORBIDDEN");
    expect(await denied(services.pro.listProMissions(find("Sophie Durand"), { filter: "ALL" }))).toBe("FORBIDDEN");
  });

  it("sans session : refus", async () => {
    expect(await denied(services.pro.getProDashboard(null))).toBe("UNAUTHENTICATED");
  });
});

describe("commandes et actions", () => {
  it("le rattachement vient de la session, jamais de la saisie", async () => {
    const julien = find("Julien Martin");
    const thomas = find("Thomas Lefèvre") as Extract<Actor, { kind: "BUSINESS" }>;
    const today = todayInZone();
    const result = await services.orders.placeOrder(julien, {
      pickupAddress: "12 rue Nationale, 59000 Lille",
      dropoffAddress: "Place des Héros, 62000 Arras",
      date: today,
      time: "23:00",
      vehicle: { category: "SEDAN", fuelType: "DIESEL" },
      businessAccountId: thomas.businessAccountId,
      ownership: { businessAccountId: thomas.businessAccountId },
      pricing: { totals: { ht: 1 } },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(await services.pro.getProMission(julien, result.data.id)).not.toBeNull();
    expect(await services.pro.getProMission(thomas, result.data.id)).toBeNull();
    const created = (await services.pro.getProMission(julien, result.data.id))!;
    expect(created.mission.totals.ht).toBeGreaterThan(100);
    expect(created.mission.status).toBe("CONFIRMED");
  });

  it("une commande dans le passé est refusée", async () => {
    const result = await services.orders.quoteOrder(find("Sophie Durand"), {
      pickupAddress: "Paris",
      dropoffAddress: "Lille",
      date: "2020-01-01",
      time: "09:00",
      vehicle: { category: "CITY", fuelType: "PETROL" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.date).toBeDefined();
  });

  it("le convoyeur fait avancer sa mission, pas celle d'un autre", async () => {
    const marc = find("Marc Dubois");
    const { upcoming, current } = await services.driver.listDriverMissions(marc);
    const assigned = upcoming.find((mission) => mission.status === "ASSIGNED");
    expect(assigned).toBeDefined();
    const started = await services.driver.performDriverAction(marc, assigned!.id, "START");
    expect(started.ok).toBe(true);
    const complete = await services.driver.performDriverAction(marc, current[0].id, "COMPLETE");
    expect(complete.ok).toBe(false);
    const staff = await services.admin.listAdminMissions(find("Inès Moreau"));
    const other = staff.find(
      (mission) => mission.status === "IN_PROGRESS" && mission.assignment?.driverName !== "Marc Dubois",
    );
    const foreign = await services.driver.performDriverAction(marc, other!.id, "START_DRIVING");
    expect(foreign.ok).toBe(false);
    if (!foreign.ok) expect(foreign.code).toBe("NOT_FOUND");
  });

  it("le client accepte un devis de son périmètre", async () => {
    const julien = find("Julien Martin");
    const { toConfirm } = await services.pro.getProDashboard(julien);
    const result = await services.orders.confirmQuotedMission(julien, toConfirm[0].id);
    expect(result.ok).toBe(true);
    const detail = await services.pro.getProMission(julien, toConfirm[0].id);
    expect(detail?.mission.status).toBe("CONFIRMED");
  });
});
