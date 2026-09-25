import { beforeAll, describe, expect, it } from "vitest";
import { todayInZone } from "@/core/shared/timezone";
import { referenceMissions, statusOf, type PersonaName } from "./support";

/**
 * Convention des statuts HTTP, vérifiée sur le serveur de production :
 * 401 sans session · 403 sans permission (rôle, portail ou offre) ·
 * 404 ressource d'un autre locataire · 200 ressource autorisée.
 */

let ids: Awaited<ReturnType<typeof referenceMissions>>;
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

beforeAll(async () => {
  ids = await referenceMissions();
});

type Case = [path: string, persona: PersonaName | null, expected: number];

async function check(cases: Case[]) {
  const results = await Promise.all(
    cases.map(async ([path, persona]) => statusOf(path, persona ? { as: persona } : {})),
  );
  const mismatches = cases
    .map(([path, persona, expected], index) => ({ path, persona, expected, actual: results[index] }))
    .filter((row) => row.actual !== row.expected);
  expect(mismatches).toEqual([]);
}

describe("pages", () => {
  it("401 sans session", async () => {
    await check([
      ["/admin", null, 401],
      ["/admin/missions", null, 401],
      [`/admin/missions/${ids.martin}`, null, 401],
      ["/pro", null, 401],
      ["/pro/missions", null, 401],
      [`/pro/missions/${ids.martin}`, null, 401],
      ["/client", null, 401],
      ["/client/order", null, 401],
      ["/driver", null, 401],
      [`/driver/missions/${ids.marc}`, null, 401],
    ]);
  });

  it("200 pour l'accueil public et les ressources autorisées", async () => {
    await check([
      ["/", null, 200],
      ["/pro", "julien", 200],
      ["/pro/missions", "julien", 200],
      [`/pro/missions/${ids.martin}`, "julien", 200],
      ["/pro/missions/new", "julien", 200],
      ["/pro/billing", "julien", 200],
      ["/pro/analytics", "julien", 200],
      ["/pro/team", "julien", 200],
      ["/pro/account", "julien", 200],
      ["/pro/account", "lea", 200],
      ["/pro/missions/new", "lea", 200],
      ["/pro/billing", "nadia", 200],
      ["/client", "sophie", 200],
      ["/client/order", "sophie", 200],
      [`/client/missions/${ids.sophie}`, "sophie", 200],
      ["/client/account", "sophie", 200],
      ["/driver", "marc", 200],
      [`/driver/missions/${ids.marc}`, "marc", 200],
      ["/admin", "admin", 200],
      [`/admin/missions/${ids.locauto}`, "admin", 200],
      ["/admin/finance", "admin", 200],
      ["/admin/settings", "admin", 200],
      ["/admin/businesses", "dispatcher", 200],
    ]);
  });

  it("403 sans permission : autre portail, rôle insuffisant, offre non incluse", async () => {
    await check([
      ["/admin", "julien", 403],
      ["/client", "julien", 403],
      ["/driver", "julien", 403],
      ["/pro", "sophie", 403],
      ["/admin/missions", "marc", 403],
      ["/pro/billing", "lea", 403],
      ["/pro/analytics", "lea", 403],
      ["/pro/team", "lea", 403],
      ["/pro/missions/new", "nadia", 403],
      ["/pro/analytics", "thomas", 403],
      ["/pro/team", "thomas", 403],
      ["/admin/finance", "dispatcher", 403],
      ["/admin/settings", "dispatcher", 403],
    ]);
  });

  it("404 pour une ressource d'un autre locataire ou inexistante", async () => {
    await check([
      [`/pro/missions/${ids.locauto}`, "julien", 404],
      [`/pro/missions/${ids.martin}`, "thomas", 404],
      [`/pro/missions/${ids.sophie}`, "lea", 404],
      [`/client/missions/${ids.martin}`, "sophie", 404],
      [`/driver/missions/${ids.otherDriver}`, "marc", 404],
      [`/pro/missions/${UNKNOWN_ID}`, "julien", 404],
      [`/admin/missions/${UNKNOWN_ID}`, "admin", 404],
    ]);
  });
});

describe("API v1", () => {
  it("401 sans session", async () => {
    const paths = ["/api/v1/me", "/api/v1/missions", `/api/v1/missions/${ids.martin}`, "/api/v1/settings"];
    const statuses = await Promise.all(paths.map((path) => statusOf(path)));
    expect(statuses).toEqual(paths.map(() => 401));
    expect(await statusOf("/api/v1/orders", { method: "POST", body: {} })).toBe(401);
    expect(await statusOf("/api/v1/places?q=lil")).toBe(401);
  });

  it("200 pour les ressources autorisées", async () => {
    await check([
      ["/api/v1/me", "julien", 200],
      ["/api/v1/missions", "julien", 200],
      [`/api/v1/missions/${ids.martin}`, "julien", 200],
      [`/api/v1/missions/${ids.sophie}`, "sophie", 200],
      [`/api/v1/missions/${ids.marc}`, "marc", 200],
      [`/api/v1/missions/${ids.locauto}`, "admin", 200],
      ["/api/v1/settings", "admin", 200],
    ]);
    const quote = await statusOf("/api/v1/orders/quote", {
      as: "sophie",
      method: "POST",
      body: {
        pickupAddress: "Place de la Nation, 75011 Paris",
        dropoffAddress: "Rue Faidherbe, 59000 Lille",
        date: todayInZone(),
        time: "23:30",
        vehicle: { category: "CITY", fuelType: "PETROL" },
      },
    });
    expect(quote).toBe(200);
  });

  it("403 sans permission", async () => {
    await check([
      ["/api/v1/settings", "julien", 403],
      ["/api/v1/settings", "sophie", 403],
      ["/api/v1/settings", "marc", 403],
    ]);
    expect(await statusOf("/api/v1/simulations", { as: "julien", method: "POST", body: {} })).toBe(403);
    expect(await statusOf("/api/v1/missions", { as: "sophie", method: "POST", body: {} })).toBe(403);
    expect(await statusOf("/api/v1/orders", { as: "nadia", method: "POST", body: {} })).toBe(403);
    expect(await statusOf("/api/v1/orders", { as: "marc", method: "POST", body: {} })).toBe(403);
    expect(
      await statusOf(`/api/v1/missions/${ids.martin}/actions`, {
        as: "julien",
        method: "POST",
        body: { action: "CANCEL" },
      }),
    ).toBe(403);
  });

  it("404 pour une ressource d'un autre locataire", async () => {
    await check([
      [`/api/v1/missions/${ids.locauto}`, "julien", 404],
      [`/api/v1/missions/${ids.martin}`, "sophie", 404],
      [`/api/v1/missions/${ids.otherDriver}`, "marc", 404],
    ]);
    expect(
      await statusOf(`/api/v1/missions/${ids.locauto}/actions`, {
        as: "julien",
        method: "POST",
        body: { action: "CONFIRM" },
      }),
    ).toBe(404);
    expect(
      await statusOf(`/api/v1/missions/${ids.otherDriver}/actions`, {
        as: "marc",
        method: "POST",
        body: { action: "START_DRIVING" },
      }),
    ).toBe(404);
  });

  it("session falsifiée ou expirée : 401", async () => {
    const response = await fetch(`${(await import("./support")).BASE_URL}/api/v1/me`, {
      headers: { cookie: "naera_session=abc.def" },
    });
    expect(response.status).toBe(401);
  });
});
