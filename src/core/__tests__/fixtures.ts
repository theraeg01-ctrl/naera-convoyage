import { DEFAULT_SETTINGS } from "../settings/defaults";
import type { AppSettings } from "../settings/types";
import type { SimulationResult } from "../simulation/types";
import type { TransportOption } from "../transport/types";

/** Copie profonde des paramètres par défaut, modifiable dans un test. */
export function testSettings(patch?: (settings: AppSettings) => void): AppSettings {
  const settings = structuredClone(DEFAULT_SETTINGS);
  patch?.(settings);
  return settings;
}

function option(
  partial: Partial<TransportOption> & Pick<TransportOption, "id" | "mode" | "price" | "durationMin">,
): TransportOption {
  return {
    direction: "RETURN",
    connections: 0,
    simplicity: 0.7,
    detail: "",
    source: "SIMULATED",
    ...partial,
  };
}

/** Options de retour Lille → Paris (scénario principal). */
export const LILLE_RETURN_OPTIONS: TransportOption[] = [
  option({ id: "ret-train", mode: "TRAIN", price: 32, durationMin: 75, connections: 0, simplicity: 0.8 }),
  option({ id: "ret-transit", mode: "PUBLIC_TRANSIT", price: 21, durationMin: 165, connections: 1, simplicity: 0.5 }),
  option({ id: "ret-vtc", mode: "VTC", price: 189, durationMin: 155, connections: 0, simplicity: 1 }),
  option({ id: "ret-taxi", mode: "TAXI", price: 290, durationMin: 155, connections: 0, simplicity: 1 }),
  option({ id: "ret-companion", mode: "COMPANION", price: 176, durationMin: 150, connections: 0, simplicity: 0.9 }),
];

/** Simulation Paris → Lille : 220 km, 2 h 30, 18 € de péages, train retour 32 € / 1 h 15. */
export function parisLilleSimulation(): SimulationResult {
  return {
    request: {
      pickupAddress: "Paris",
      dropoffAddress: "Lille",
      date: "2026-09-29",
      time: "09:00",
      vehicle: { category: "SEDAN", fuelType: "PETROL" },
      accessMode: "AUTO",
      returnMode: "AUTO",
      strategy: "BALANCED",
      waitingMin: 0,
      optionIds: [],
    },
    pickup: { label: "Paris", city: "Paris", postalCode: "75001", point: { lat: 48.8566, lng: 2.3522 } },
    dropoff: { label: "Lille", city: "Lille", postalCode: "59000", point: { lat: 50.6292, lng: 3.0573 } },
    base: { label: "Paris", city: "Paris", postalCode: "75001", point: { lat: 48.8566, lng: 2.3522 } },
    routes: [
      {
        kind: "FASTEST",
        distanceKm: 220,
        durationMin: 150,
        trafficDurationMin: 150,
        tollsEur: 18,
        summary: "A1",
        source: "SIMULATED",
      },
      {
        kind: "NO_TOLL",
        distanceKm: 233,
        durationMin: 207,
        trafficDurationMin: 207,
        tollsEur: 0,
        summary: "N17",
        source: "SIMULATED",
      },
    ],
    accessOptions: [
      option({
        id: "acc-transit",
        mode: "PUBLIC_TRANSIT",
        direction: "ACCESS",
        price: 4.3,
        durationMin: 40,
        connections: 1,
        simplicity: 0.6,
      }),
      option({ id: "acc-vtc", mode: "VTC", direction: "ACCESS", price: 25, durationMin: 25, simplicity: 1 }),
    ],
    returnOptions: LILLE_RETURN_OPTIONS,
    dataMode: "DEMO",
    demoScenario: "Paris → Lille",
    notices: [],
    generatedAt: "2026-09-24T10:00:00.000Z",
  };
}
