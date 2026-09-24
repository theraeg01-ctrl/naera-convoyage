import { z } from "zod";
import { DATA_SOURCES, ROUTE_KINDS } from "../routing/types";
import { FUEL_TYPES, OPTIMIZATION_STRATEGIES, SELECTABLE_OPTION_IDS, VEHICLE_CATEGORIES } from "../settings/types";
import { isValidLocalDate, isValidTime } from "../shared/calendar";
import { TRANSPORT_MODES } from "../transport/types";

const transportPreferenceSchema = z.enum(["AUTO", ...TRANSPORT_MODES]);

export const marginPolicySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("PERCENT"), percent: z.number().min(0).max(500) }),
  z.object({ mode: z.literal("FIXED"), amount: z.number().min(0).max(10_000) }),
]);

const manualLegSchema = z.object({
  price: z.number().min(0, "Le prix ne peut pas être négatif").max(5_000),
  durationMin: z
    .number()
    .int()
    .min(0)
    .max(48 * 60),
  label: z.string().trim().max(60).optional(),
});

export const manualRouteSchema = z.object({
  distanceKm: z.number({ error: "Distance requise" }).positive("La distance doit être positive").max(3_000),
  durationMin: z
    .number({ error: "Durée requise" })
    .int()
    .positive("La durée doit être positive")
    .max(48 * 60),
  tollsEur: z.number().min(0, "Les péages ne peuvent pas être négatifs").max(1_000),
});

const addressSchema = z.string().trim().min(2, "Adresse trop courte").max(200, "Adresse trop longue");

export const missionRequestSchema = z.object({
  pickupAddress: addressSchema,
  dropoffAddress: addressSchema,
  date: z.string().refine(isValidLocalDate, "Date invalide"),
  time: z.string().refine(isValidTime, "Heure invalide"),
  vehicle: z.object({
    category: z.enum(VEHICLE_CATEGORIES),
    fuelType: z.enum(FUEL_TYPES),
    consumptionPer100: z.number().positive("Consommation invalide").max(100).optional(),
  }),
  accessMode: transportPreferenceSchema,
  returnMode: transportPreferenceSchema,
  strategy: z.enum(OPTIMIZATION_STRATEGIES),
  margin: marginPolicySchema.optional(),
  waitingMin: z
    .number()
    .int()
    .min(0)
    .max(12 * 60),
  optionIds: z.array(z.enum(SELECTABLE_OPTION_IDS)).max(SELECTABLE_OPTION_IDS.length),
  manualRoute: manualRouteSchema.optional(),
  manualAccess: manualLegSchema.optional(),
  manualReturn: manualLegSchema.optional(),
});

const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const placeSchema = z.object({
  label: z.string().max(200),
  city: z.string().max(100).nullable(),
  postalCode: z.string().max(10).nullable(),
  point: geoPointSchema.nullable(),
});

export const routeOptionSchema = z.object({
  kind: z.enum(ROUTE_KINDS),
  distanceKm: z.number().positive().max(5_000),
  durationMin: z.number().positive().max(5_000),
  trafficDurationMin: z.number().positive().max(5_000),
  tollsEur: z.number().min(0).max(2_000),
  summary: z.string().max(200),
  polyline: z.string().max(100_000).optional(),
  source: z.enum(DATA_SOURCES),
});

export const transportOptionSchema = z.object({
  id: z.string().min(1).max(80),
  mode: z.enum(TRANSPORT_MODES),
  direction: z.enum(["ACCESS", "RETURN"]),
  price: z.number().min(0).max(10_000),
  durationMin: z.number().min(0).max(5_000),
  connections: z.number().int().min(0).max(10),
  simplicity: z.number().min(0).max(1),
  detail: z.string().max(200),
  departureTime: z.string().max(5).optional(),
  arrivalTime: z.string().max(5).optional(),
  fromStation: z.string().max(100).optional(),
  toStation: z.string().max(100).optional(),
  distanceKm: z.number().min(0).max(5_000).optional(),
  source: z.enum(DATA_SOURCES),
});

export const simulationResultSchema = z.object({
  request: missionRequestSchema,
  pickup: placeSchema,
  dropoff: placeSchema,
  base: placeSchema,
  routes: z.array(routeOptionSchema).max(5),
  accessOptions: z.array(transportOptionSchema).max(10),
  returnOptions: z.array(transportOptionSchema).max(10),
  dataMode: z.enum(["DEMO", "LIVE", "MIXED"]),
  demoScenario: z.string().max(80).nullable(),
  notices: z.array(z.object({ level: z.enum(["info", "warning"]), message: z.string().max(300) })).max(10),
  generatedAt: z.string().max(40),
});

export const simulationSelectionsSchema = z.object({
  routeKind: z.enum(ROUTE_KINDS),
  strategy: z.enum(OPTIMIZATION_STRATEGIES),
  accessOptionId: z.string().max(80).nullable(),
  returnOptionId: z.string().max(80).nullable(),
  overrides: z.object({
    distanceKm: z.number().positive().max(3_000).optional(),
    durationMin: z
      .number()
      .positive()
      .max(48 * 60)
      .optional(),
    tollsEur: z.number().min(0).max(1_000).optional(),
    returnPrice: z.number().min(0).max(5_000).optional(),
  }),
});
