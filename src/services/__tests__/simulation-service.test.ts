import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/core/settings/defaults";
import { defaultSelections, resolveSimulation } from "@/core/simulation/resolve";
import type { MissionRequest } from "@/core/simulation/types";
import { resolvePlace } from "../geo/geo";
import { MockRoutingProvider } from "../routing/mock-routing-provider";
import { ROUTING_FAILURE_MESSAGE, RoutingService } from "../routing/routing-service";
import type { RoutingProvider } from "../routing/types";
import { SimulationService } from "../simulation/simulation-service";

const settings = structuredClone(DEFAULT_SETTINGS);
const service = new SimulationService(new RoutingService(new MockRoutingProvider()));

function request(pickupAddress: string, dropoffAddress: string, extra: Partial<MissionRequest> = {}): MissionRequest {
  return {
    pickupAddress,
    dropoffAddress,
    date: "2026-09-29",
    time: "13:00",
    vehicle: { category: "SEDAN", fuelType: "PETROL" },
    accessMode: "AUTO",
    returnMode: "AUTO",
    strategy: "BALANCED",
    waitingMin: 0,
    optionIds: [],
    ...extra,
  };
}

describe("Localisation des adresses (simulée)", () => {
  it("reconnaît ville, code postal et arrondissements parisiens", () => {
    expect(resolvePlace("18 avenue de la Grande Armée, 75017 Paris").city).toBe("Paris");
    expect(resolvePlace("Lille").city).toBe("Lille");
    expect(resolvePlace("12 rue X, 69003").city).toBe("Lyon");
    expect(resolvePlace("saint-etienne").city).toBe("Saint-Étienne");
  });

  it("privilégie le code postal sur un nom de ville cité dans la rue", () => {
    expect(resolvePlace("Avenue de Paris, 76000 Rouen").city).toBe("Rouen");
  });

  it("ne localise pas une adresse inconnue", () => {
    expect(resolvePlace("Lieu-dit inconnu").point).toBeNull();
  });
});

describe("SimulationService (mock)", () => {
  it("Paris → Lille : données de démonstration du scénario principal", async () => {
    const result = await service.run(request("Paris", "Lille"), settings);
    expect(result.dataMode).toBe("DEMO");
    expect(result.demoScenario).toBe("Paris → Lille");
    const fastest = result.routes.find((route) => route.kind === "FASTEST");
    expect(fastest).toMatchObject({ distanceKm: 220, durationMin: 150, tollsEur: 18, source: "SIMULATED" });
    expect(result.routes.map((route) => route.kind)).toEqual(["FASTEST", "ECONOMIC", "NO_TOLL"]);
    const train = result.returnOptions.find((option) => option.mode === "TRAIN");
    expect(train).toMatchObject({
      price: 32,
      durationMin: 75,
      connections: 0,
      fromStation: "Lille-Flandres",
      toStation: "Paris-Nord",
    });
  });

  it("recommande le train au retour et propose un aller local", async () => {
    const result = await service.run(request("Paris", "Lille"), settings);
    const resolved = resolveSimulation(result, defaultSelections(result), settings);
    expect(resolved?.return.selected?.mode).toBe("TRAIN");
    expect(resolved?.access.selected?.mode).toBe("PUBLIC_TRANSIT");
    expect(resolved?.pricing.totals.ht).toBeGreaterThan(0);
  });

  it("estime une mission hors scénario", async () => {
    const result = await service.run(request("Nantes", "Rennes"), settings);
    expect(result.routes[0].distanceKm).toBeGreaterThan(90);
    expect(result.routes[0].distanceKm).toBeLessThan(140);
    expect(result.accessOptions.some((option) => option.mode === "TRAIN")).toBe(true);
    expect(result.demoScenario).toBeNull();
  });

  it("adresse inconnue : aucun itinéraire, message clair, pas d'exception", async () => {
    const result = await service.run(request("Lieu-dit inconnu", "Lille"), settings);
    expect(result.routes).toEqual([]);
    expect(result.notices.map((notice) => notice.message)).toContain(ROUTING_FAILURE_MESSAGE);
    expect(resolveSimulation(result, defaultSelections(result), settings)).toBeNull();
  });

  it("saisie manuelle de secours : l'itinéraire est marqué MANUEL", async () => {
    const result = await service.run(
      request("Lieu-dit inconnu", "Lille", { manualRoute: { distanceKm: 180, durationMin: 130, tollsEur: 12 } }),
      settings,
    );
    expect(result.routes[0]).toMatchObject({ distanceKm: 180, source: "MANUAL" });
    expect(resolveSimulation(result, defaultSelections(result), settings)).not.toBeNull();
  });

  it("bascule sur la simulation si l'API réelle échoue", async () => {
    const failing: RoutingProvider = {
      id: "google-routes",
      computeRoutes: async () => {
        throw new Error("HTTP 403");
      },
    };
    const withFailingApi = new SimulationService(new RoutingService(failing));
    const result = await withFailingApi.run(request("Paris", "Lyon"), settings);
    expect(result.routes[0].distanceKm).toBe(465);
    expect(result.notices[0].message).not.toContain("403");
  });
});
