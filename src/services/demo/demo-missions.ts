import type { CustomerInfo, MissionProgress, MissionStatus, VehicleInfo } from "@/core/mission/types";
import { addDays } from "@/core/shared/calendar";
import { todayInZone } from "@/core/shared/timezone";
import type { MissionRequest } from "@/core/simulation/types";

export interface DemoMissionSeed {
  request: MissionRequest;
  customer: CustomerInfo;
  vehicle: Pick<VehicleInfo, "make" | "model" | "plate">;
  status: MissionStatus;
  progress: MissionProgress;
  notes?: string;
}

function request(
  pickupAddress: string,
  dropoffAddress: string,
  date: string,
  time: string,
  vehicle: MissionRequest["vehicle"],
  extra: Partial<MissionRequest> = {},
): MissionRequest {
  return {
    pickupAddress,
    dropoffAddress,
    date,
    time,
    vehicle,
    accessMode: "AUTO",
    returnMode: "AUTO",
    strategy: "BALANCED",
    waitingMin: 0,
    optionIds: [],
    ...extra,
  };
}

/** Jeu de missions de démonstration, daté par rapport à aujourd'hui. */
export function buildDemoMissions(now: Date): DemoMissionSeed[] {
  const today = todayInZone(now);
  const day = (offset: number) => addDays(today, offset);
  const at = (offsetMinutes: number) => new Date(now.getTime() - offsetMinutes * 60_000).toISOString();

  return [
    {
      request: request("18 avenue de la Grande Armée, 75017 Paris", "Rue Faidherbe, 59000 Lille", day(0), "09:00", {
        category: "SEDAN",
        fuelType: "DIESEL",
      }),
      customer: { type: "PROFESSIONAL", companyName: "Garage Martin", phone: "03 20 00 00 00" },
      vehicle: { make: "Peugeot", model: "308 SW", plate: "GH-482-TK" },
      status: "IN_PROGRESS",
      progress: { startedAt: at(150), inspectedAt: at(100) },
    },
    {
      request: request(
        "Place de la Nation, 75011 Paris",
        "Cours Lafayette, 69003 Lyon",
        day(0),
        "14:00",
        {
          category: "SEDAN",
          fuelType: "ELECTRIC",
        },
        { optionIds: ["PHOTO_INSPECTION", "KEY_HANDOVER"] },
      ),
      customer: { type: "INDIVIDUAL", firstName: "Sophie", lastName: "Durand", phone: "06 12 34 56 78" },
      vehicle: { make: "Tesla", model: "Model 3", plate: "FR-221-EV" },
      status: "CONFIRMED",
      progress: {},
    },
    {
      request: request(
        "Boulevard Haussmann, 75009 Paris",
        "Quai du Havre, 76000 Rouen",
        day(1),
        "10:00",
        {
          category: "PREMIUM",
          fuelType: "PETROL",
        },
        { optionIds: ["PHOTO_REPORT"] },
      ),
      customer: { type: "PROFESSIONAL", companyName: "Auto Prestige 76", email: "contact@autoprestige76.fr" },
      vehicle: { make: "BMW", model: "Série 3", plate: "EZ-904-QB" },
      status: "QUOTED",
      progress: {},
    },
    {
      request: request("Rue de Rivoli, 75004 Paris", "Quai des Chartrons, 33000 Bordeaux", day(3), "08:00", {
        category: "CITY",
        fuelType: "PETROL",
      }),
      customer: { type: "INDIVIDUAL", firstName: "Lucas", lastName: "Bernard" },
      vehicle: { make: "Renault", model: "Clio", plate: "GA-117-LM" },
      status: "DRAFT",
      progress: {},
      notes: "Client flexible sur l'horaire de livraison.",
    },
    {
      request: request("Porte Maillot, 75017 Paris", "Gare Lille-Europe, 59000 Lille", day(-2), "07:30", {
        category: "VAN",
        fuelType: "DIESEL",
      }),
      customer: { type: "PROFESSIONAL", companyName: "Loc'Auto Nord" },
      vehicle: { make: "Renault", model: "Trafic", plate: "FD-350-RN" },
      status: "COMPLETED",
      progress: {
        startedAt: at(2 * 1440 + 90),
        inspectedAt: at(2 * 1440 + 40),
        drivingAt: at(2 * 1440 + 20),
        deliveredAt: at(2 * 1440 - 160),
        completedAt: at(2 * 1440 - 180),
      },
    },
    {
      request: request("Avenue d'Italie, 75013 Paris", "Rue Jeanne d'Arc, 76000 Rouen", day(-5), "09:30", {
        category: "SUV",
        fuelType: "HYBRID",
      }),
      customer: { type: "INDIVIDUAL", firstName: "Camille", lastName: "Leroy" },
      vehicle: { make: "Toyota", model: "C-HR", plate: "GK-808-HY" },
      status: "COMPLETED",
      progress: {
        startedAt: at(5 * 1440),
        inspectedAt: at(5 * 1440 - 30),
        drivingAt: at(5 * 1440 - 45),
        deliveredAt: at(5 * 1440 - 160),
        completedAt: at(5 * 1440 - 170),
      },
    },
    {
      request: request("Rue de Vaugirard, 75015 Paris", "Place Bellecour, 69002 Lyon", day(-1), "11:00", {
        category: "SEDAN",
        fuelType: "PETROL",
      }),
      customer: { type: "PROFESSIONAL", companyName: "Concession Lyon Sud" },
      vehicle: { make: "Volkswagen", model: "Passat" },
      status: "CANCELLED",
      progress: {},
      notes: "Annulée par le client (véhicule vendu sur place).",
    },
  ];
}
