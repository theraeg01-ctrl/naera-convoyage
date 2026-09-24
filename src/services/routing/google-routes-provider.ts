import "server-only";
import { z } from "zod";
import type { RouteOption } from "@/core/routing/types";
import { zonedLocalToUtcIso } from "@/core/shared/timezone";
import { RoutingUnavailableError, type RoutingProvider, type RoutingRequest } from "./types";

const ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";
const FIELD_MASK = [
  "routes.distanceMeters",
  "routes.duration",
  "routes.staticDuration",
  "routes.description",
  "routes.polyline.encodedPolyline",
  "routes.travelAdvisory.tollInfo",
].join(",");
const TIMEOUT_MS = 8_000;

const moneySchema = z.object({
  currencyCode: z.string().optional(),
  units: z.string().optional(),
  nanos: z.number().optional(),
});

const responseSchema = z.object({
  routes: z
    .array(
      z.object({
        distanceMeters: z.number().optional(),
        duration: z.string().optional(),
        staticDuration: z.string().optional(),
        description: z.string().optional(),
        polyline: z.object({ encodedPolyline: z.string().optional() }).optional(),
        travelAdvisory: z
          .object({ tollInfo: z.object({ estimatedPrice: z.array(moneySchema).optional() }).optional() })
          .optional(),
      }),
    )
    .optional(),
});

type GoogleRoute = NonNullable<z.infer<typeof responseSchema>["routes"]>[number];

function durationToMinutes(value: string | undefined): number {
  const seconds = value ? Number.parseFloat(value.replace("s", "")) : Number.NaN;
  return Number.isFinite(seconds) ? Math.max(1, Math.round(seconds / 60)) : 0;
}

function tollsInEuros(route: GoogleRoute): number {
  const prices = route.travelAdvisory?.tollInfo?.estimatedPrice ?? [];
  const total = prices
    .filter((price) => (price.currencyCode ?? "EUR") === "EUR")
    .reduce((sum, price) => sum + Number(price.units ?? 0) + (price.nanos ?? 0) / 1e9, 0);
  return Math.round(total * 100) / 100;
}

function toRouteOption(route: GoogleRoute, kind: RouteOption["kind"]): RouteOption | null {
  const distanceKm = Math.round(((route.distanceMeters ?? 0) / 1000) * 10) / 10;
  const trafficDurationMin = durationToMinutes(route.duration);
  const durationMin = durationToMinutes(route.staticDuration) || trafficDurationMin;
  if (distanceKm <= 0 || trafficDurationMin <= 0) return null;
  return {
    kind,
    distanceKm,
    durationMin,
    trafficDurationMin,
    tollsEur: tollsInEuros(route),
    summary: route.description || "Itinéraire Google",
    polyline: route.polyline?.encodedPolyline,
    source: "LIVE",
  };
}

/** Adaptateur Google Routes API (computeRoutes), appelé uniquement côté serveur. */
export class GoogleRoutesProvider implements RoutingProvider {
  readonly id = "google-routes" as const;

  constructor(private readonly apiKey: string) {}

  private async call(request: RoutingRequest, avoidTolls: boolean): Promise<GoogleRoute[]> {
    const departureIso = zonedLocalToUtcIso(request.departure.date, request.departure.time);
    const inFuture = Date.parse(departureIso) > Date.now() + 60_000;
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        origin: { address: request.origin.label },
        destination: { address: request.destination.label },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        ...(inFuture ? { departureTime: departureIso } : {}),
        computeAlternativeRoutes: !avoidTolls,
        extraComputations: ["TOLLS"],
        routeModifiers: { avoidTolls, vehicleInfo: { emissionType: "GASOLINE" } },
        languageCode: "fr-FR",
        regionCode: "fr",
        units: "METRIC",
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new RoutingUnavailableError(
        "PROVIDER_ERROR",
        `Google Routes HTTP ${response.status} ${text.slice(0, 300)}`,
      );
    }
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) throw new RoutingUnavailableError("PROVIDER_ERROR", "Réponse Google Routes inattendue");
    return parsed.data.routes ?? [];
  }

  async computeRoutes(request: RoutingRequest): Promise<RouteOption[]> {
    const [main, noToll] = await Promise.all([
      this.call(request, false),
      this.call(request, true).catch(() => [] as GoogleRoute[]),
    ]);
    const candidates = main
      .map((route) => toRouteOption(route, "FASTEST"))
      .filter((route): route is RouteOption => route !== null)
      .sort((a, b) => a.trafficDurationMin - b.trafficDurationMin);
    const fastest = candidates[0];
    if (!fastest) throw new RoutingUnavailableError("NO_ROUTE", "Aucun itinéraire renvoyé par Google Routes");

    const routes: RouteOption[] = [fastest];
    const tripCost = (route: RouteOption) => route.tollsEur + route.distanceKm * 0.12;
    const economic = candidates.slice(1).sort((a, b) => tripCost(a) - tripCost(b))[0];
    if (economic && tripCost(economic) < tripCost(fastest) - 2) routes.push({ ...economic, kind: "ECONOMIC" });
    const withoutTolls = noToll.map((route) => toRouteOption(route, "NO_TOLL")).find((route) => route !== null);
    if (withoutTolls && fastest.tollsEur > 0 && withoutTolls.tollsEur < fastest.tollsEur) routes.push(withoutTolls);
    return routes;
  }
}
