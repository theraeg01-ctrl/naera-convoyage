import type { CustomerInfo, Mission, MissionEvent, VehicleInfo } from "@/core/mission/types";
import type { MissionPricing } from "@/core/pricing/mission-pricing";
import type { DataMode, MissionRequest } from "@/core/simulation/types";
import type { TransportOption } from "@/core/transport/types";
import type { Prisma } from "@/generated/prisma/client";
import type { NewMission } from "../types";

type NewMissionLike = NewMission;

export const MISSION_INCLUDE = {
  customer: true,
  vehicle: true,
  transportOptions: { orderBy: { rank: "asc" } },
  events: { orderBy: { at: "asc" } },
} as const satisfies Prisma.MissionInclude;

export type MissionRow = Prisma.MissionGetPayload<{ include: typeof MISSION_INCLUDE }>;

const toNumber = (value: Prisma.Decimal | number): number => Number(value);
const orUndefined = <T>(value: T | null): T | undefined => (value === null ? undefined : value);
const toIso = (value: Date | null): string | undefined => (value ? value.toISOString() : undefined);

function toTransportOption(row: MissionRow["transportOptions"][number]): TransportOption {
  return {
    id: row.optionKey,
    mode: row.mode,
    direction: row.direction,
    price: toNumber(row.price),
    durationMin: row.durationMin,
    connections: row.connections,
    simplicity: row.simplicity,
    detail: row.detail,
    departureTime: orUndefined(row.departureTime),
    arrivalTime: orUndefined(row.arrivalTime),
    fromStation: orUndefined(row.fromStation),
    toStation: orUndefined(row.toStation),
    distanceKm: orUndefined(row.distanceKm),
    source: row.source,
  };
}

function toCustomer(row: MissionRow["customer"]): CustomerInfo | null {
  if (!row) return null;
  return {
    type: row.type,
    firstName: orUndefined(row.firstName),
    lastName: orUndefined(row.lastName),
    companyName: orUndefined(row.companyName),
    phone: orUndefined(row.phone),
    email: orUndefined(row.email),
    address: orUndefined(row.address),
  };
}

function toVehicle(row: MissionRow["vehicle"], request: MissionRequest): VehicleInfo {
  if (!row) return { ...request.vehicle };
  return {
    category: row.category,
    fuelType: row.fuelType,
    consumptionPer100: orUndefined(row.consumptionPer100),
    make: orUndefined(row.make),
    model: orUndefined(row.model),
    plate: orUndefined(row.plate),
  };
}

export function toDomainMission(row: MissionRow): Mission {
  const request = row.request as unknown as MissionRequest;
  const options = row.transportOptions.map(toTransportOption);
  const selected = (direction: TransportOption["direction"]) =>
    options.find((option, index) => option.direction === direction && row.transportOptions[index].isSelected) ?? null;
  const events: MissionEvent[] = row.events.map((event) => ({
    id: event.id,
    type: event.type,
    label: event.label,
    at: event.at.toISOString(),
  }));
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    isDemo: row.isDemo,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    scheduledDate: row.scheduledDate,
    scheduledTime: row.scheduledTime,
    pickup: {
      label: row.pickupLabel,
      city: row.pickupCity,
      postalCode: row.pickupPostalCode,
      point: row.pickupLat !== null && row.pickupLng !== null ? { lat: row.pickupLat, lng: row.pickupLng } : null,
    },
    dropoff: {
      label: row.dropoffLabel,
      city: row.dropoffCity,
      postalCode: row.dropoffPostalCode,
      point: row.dropoffLat !== null && row.dropoffLng !== null ? { lat: row.dropoffLat, lng: row.dropoffLng } : null,
    },
    customer: toCustomer(row.customer),
    vehicle: toVehicle(row.vehicle, request),
    request,
    strategy: row.strategy,
    route: {
      kind: row.routeKind,
      distanceKm: row.distanceKm,
      durationMin: row.durationMin,
      trafficDurationMin: row.trafficDurationMin,
      tollsEur: toNumber(row.tollsEur),
      summary: row.routeSummary,
      polyline: orUndefined(row.routePolyline),
      source: row.routeSource,
    },
    accessLeg: selected("ACCESS"),
    returnLeg: selected("RETURN"),
    returnAlternatives: options.filter((option) => option.direction === "RETURN"),
    pricing: row.pricing as unknown as MissionPricing,
    dataMode: row.dataMode as DataMode,
    progress: {
      startedAt: toIso(row.startedAt),
      inspectedAt: toIso(row.inspectedAt),
      drivingAt: toIso(row.drivingAt),
      deliveredAt: toIso(row.deliveredAt),
      completedAt: toIso(row.completedAt),
    },
    events,
    notes: row.notes,
  };
}

function transportRows(mission: NewMissionLike): Prisma.TransportOptionCreateWithoutMissionInput[] {
  const rows: Prisma.TransportOptionCreateWithoutMissionInput[] = [];
  const push = (option: TransportOption, isSelected: boolean, rank: number | null) =>
    rows.push({
      optionKey: option.id,
      direction: option.direction,
      mode: option.mode,
      price: option.price,
      durationMin: Math.round(option.durationMin),
      connections: option.connections,
      simplicity: option.simplicity,
      detail: option.detail,
      departureTime: option.departureTime ?? null,
      arrivalTime: option.arrivalTime ?? null,
      fromStation: option.fromStation ?? null,
      toStation: option.toStation ?? null,
      distanceKm: option.distanceKm ?? null,
      source: option.source,
      isSelected,
      rank,
    });
  if (mission.accessLeg) push(mission.accessLeg, true, null);
  mission.returnAlternatives.forEach((option, index) => push(option, option.id === mission.returnLeg?.id, index + 1));
  if (mission.returnLeg && !mission.returnAlternatives.some((option) => option.id === mission.returnLeg?.id)) {
    push(mission.returnLeg, true, null);
  }
  return rows;
}

export function toMissionCreateInput(
  mission: NewMissionLike,
  reference: string,
  scheduledAt: Date,
): Prisma.MissionCreateInput {
  const { pricing, route, customer, vehicle } = mission;
  const date = (iso: string | undefined) => (iso ? new Date(iso) : null);
  return {
    reference,
    status: mission.status,
    isDemo: mission.isDemo,
    scheduledAt,
    scheduledDate: mission.scheduledDate,
    scheduledTime: mission.scheduledTime,
    pickupLabel: mission.pickup.label,
    pickupCity: mission.pickup.city,
    pickupPostalCode: mission.pickup.postalCode,
    pickupLat: mission.pickup.point?.lat ?? null,
    pickupLng: mission.pickup.point?.lng ?? null,
    dropoffLabel: mission.dropoff.label,
    dropoffCity: mission.dropoff.city,
    dropoffPostalCode: mission.dropoff.postalCode,
    dropoffLat: mission.dropoff.point?.lat ?? null,
    dropoffLng: mission.dropoff.point?.lng ?? null,
    routeKind: route.kind,
    distanceKm: route.distanceKm,
    durationMin: Math.round(route.durationMin),
    trafficDurationMin: Math.round(route.trafficDurationMin),
    tollsEur: route.tollsEur,
    routeSummary: route.summary,
    routePolyline: route.polyline ?? null,
    routeSource: route.source,
    strategy: mission.strategy,
    dataMode: mission.dataMode,
    priceHT: pricing.totals.ht,
    vatAmount: pricing.totals.vat,
    priceTTC: pricing.totals.ttc,
    costTotal: pricing.costs.total,
    marginAmount: pricing.margin.amount,
    request: mission.request as unknown as Prisma.InputJsonValue,
    pricing: pricing as unknown as Prisma.InputJsonValue,
    startedAt: date(mission.progress.startedAt),
    inspectedAt: date(mission.progress.inspectedAt),
    drivingAt: date(mission.progress.drivingAt),
    deliveredAt: date(mission.progress.deliveredAt),
    completedAt: date(mission.progress.completedAt),
    notes: mission.notes,
    customer: customer
      ? {
          create: {
            type: customer.type,
            firstName: customer.firstName ?? null,
            lastName: customer.lastName ?? null,
            companyName: customer.companyName ?? null,
            phone: customer.phone ?? null,
            email: customer.email ?? null,
            address: customer.address ?? null,
          },
        }
      : undefined,
    vehicle: {
      create: {
        category: vehicle.category,
        fuelType: vehicle.fuelType,
        consumptionPer100: vehicle.consumptionPer100 ?? null,
        make: vehicle.make ?? null,
        model: vehicle.model ?? null,
        plate: vehicle.plate ?? null,
      },
    },
    cost: {
      create: {
        driver: pricing.costs.driver,
        access: pricing.costs.access,
        fuel: pricing.costs.fuel,
        tolls: pricing.costs.tolls,
        returnCost: pricing.costs.return,
        fixedFees: pricing.costs.fixedFees,
        variableFees: pricing.costs.variableFees,
        options: pricing.costs.options,
        other: pricing.costs.other,
        total: pricing.costs.total,
        totalMinutes: pricing.duration.totalMin,
        fuelQuantity: pricing.fuel.quantity,
        fuelUnit: pricing.fuel.unit,
        fuelUnitPrice: pricing.fuel.unitPrice,
      },
    },
    transportOptions: { create: transportRows(mission) },
    events: {
      create: mission.events.map((event) => ({
        id: event.id,
        type: event.type,
        label: event.label,
        at: new Date(event.at),
      })),
    },
  };
}
