import "server-only";
import { z } from "zod";
import type { Actor } from "@/core/access/actor";
import { canPerformMissionAction } from "@/core/access/mission-actions";
import { AccessDeniedError } from "@/core/access/permissions";
import type { PriceLine } from "@/core/pricing/options";
import type { VatBreakdown } from "@/core/pricing/vat";
import { missionScopeFor } from "@/core/access/scope";
import type { ContactPerson, CustomerInfo, MissionOwnership } from "@/core/mission/types";
import { isValidLocalDate, isValidTime } from "@/core/shared/calendar";
import {
  FUEL_TYPES,
  SELECTABLE_OPTION_IDS,
  VEHICLE_CATEGORIES,
  type OptionPricing,
  type SelectableOptionId,
} from "@/core/settings/types";
import type { DataMode, MissionRequest } from "@/core/simulation/types";
import { attempt, invalidInput, ok, run, type UseCaseResult } from "../result";
import { getSettings } from "../settings/settings-service";
import { assertCustomer, getAppRepositories, getMissionService, today, type CustomerActor } from "./common";

/**
 * Commandes depuis les portails client et professionnel. Le navigateur
 * n'envoie qu'une demande (adresses, date, véhicule, options) : trajet,
 * transports et tarif sont recalculés par le serveur, et le rattachement
 * (entreprise ou particulier) est déduit de la session, jamais de la saisie.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .optional()
    .transform((value) => (value ? value : undefined));

const addressSchema = z.string().trim().min(3, "Adresse trop courte").max(200, "Adresse trop longue");

const contactSchema = z
  .object({ name: optionalText(80), phone: optionalText(30) })
  .optional()
  .transform((value): ContactPerson | null =>
    value?.name ? { name: value.name, ...(value.phone ? { phone: value.phone } : {}) } : null,
  );

export const customerOrderSchema = z.object({
  pickupAddress: addressSchema,
  dropoffAddress: addressSchema,
  date: z.string().refine(isValidLocalDate, "Date invalide"),
  time: z.string().refine(isValidTime, "Heure invalide"),
  vehicle: z.object({
    category: z.enum(VEHICLE_CATEGORIES),
    fuelType: z.enum(FUEL_TYPES),
    make: optionalText(40),
    model: optionalText(60),
    plate: optionalText(15),
  }),
  optionIds: z.array(z.enum(SELECTABLE_OPTION_IDS)).max(SELECTABLE_OPTION_IDS.length).default([]),
  pickupContact: contactSchema,
  dropoffContact: contactSchema,
  customerReference: optionalText(40),
  notes: optionalText(1000),
});

export type CustomerOrderInput = z.input<typeof customerOrderSchema>;
type CustomerOrder = z.output<typeof customerOrderSchema>;

/** Tarif présenté au client : prix de vente uniquement. */
export interface CustomerQuoteView {
  pickup: { label: string; city: string | null };
  dropoff: { label: string; city: string | null };
  scheduledDate: string;
  scheduledTime: string;
  route: { distanceKm: number; durationMin: number };
  lines: PriceLine[];
  totals: VatBreakdown;
  dataMode: DataMode;
}

/** Option payante à la mission (catalogue configurable, sans coût interne). */
export interface ServiceOptionView {
  id: SelectableOptionId;
  label: string;
  pricing: OptionPricing;
}

function toMissionRequest(order: CustomerOrder): MissionRequest {
  return {
    pickupAddress: order.pickupAddress,
    dropoffAddress: order.dropoffAddress,
    date: order.date,
    time: order.time,
    vehicle: { category: order.vehicle.category, fuelType: order.vehicle.fuelType },
    accessMode: "AUTO",
    returnMode: "AUTO",
    strategy: "BALANCED",
    waitingMin: 0,
    optionIds: [...new Set(order.optionIds)],
  };
}

function parseOrder(input: unknown): UseCaseResult<CustomerOrder> {
  const parsed = customerOrderSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  if (parsed.data.date < today()) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Vérifie les champs indiqués.",
      fieldErrors: { date: "Choisis une date à partir d'aujourd'hui." },
    };
  }
  return ok(parsed.data);
}

export async function listCustomerOptions(actor: Actor | null): Promise<ServiceOptionView[]> {
  assertCustomer(actor, "missions.create");
  const settings = await getSettings();
  return settings.options
    .filter((option): option is typeof option & { id: SelectableOptionId } =>
      (SELECTABLE_OPTION_IDS as readonly string[]).includes(option.id),
    )
    .map((option) => ({ id: option.id, label: option.label, pricing: { ...option.pricing } }));
}

export async function quoteOrder(actor: Actor | null, input: unknown): Promise<UseCaseResult<CustomerQuoteView>> {
  return attempt("quoteOrder", async () => {
    assertCustomer(actor, "missions.create");
    const parsed = parseOrder(input);
    if (!parsed.ok) return parsed;
    const service = await getMissionService();
    const { simulation, resolved } = await service.quote(toMissionRequest(parsed.data));
    const { totals } = resolved.pricing;
    return ok({
      pickup: { label: simulation.pickup.label, city: simulation.pickup.city },
      dropoff: { label: simulation.dropoff.label, city: simulation.dropoff.city },
      scheduledDate: simulation.request.date,
      scheduledTime: simulation.request.time,
      route: { distanceKm: resolved.route.distanceKm, durationMin: resolved.route.trafficDurationMin },
      lines: resolved.pricing.lines.map(({ id, label, detail, amount, kind }) => ({ id, label, detail, amount, kind })),
      totals: { ht: totals.ht, vatPercent: totals.vatPercent, vat: totals.vat, ttc: totals.ttc },
      dataMode: simulation.dataMode,
    });
  });
}

/** Contact figé sur la mission, lu dans l'annuaire (pas dans la saisie). */
async function customerSnapshot(actor: CustomerActor): Promise<CustomerInfo> {
  const { directory } = await getAppRepositories();
  if (actor.kind === "BUSINESS") {
    const [view, user] = await Promise.all([
      directory.getBusinessAccount(actor.businessAccountId),
      directory.getUser(actor.userId),
    ]);
    if (!view) throw new AccessDeniedError("FORBIDDEN");
    return {
      type: "PROFESSIONAL",
      companyName: view.account.name,
      firstName: user?.name,
      email: view.account.billingEmail ?? user?.email,
      phone: user?.phone ?? undefined,
    };
  }
  const customer = await directory.getPersonalCustomer(actor.personalCustomerId);
  if (!customer) throw new AccessDeniedError("FORBIDDEN");
  return {
    type: "INDIVIDUAL",
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email ?? undefined,
    phone: customer.phone ?? undefined,
    address: customer.address ?? undefined,
  };
}

function ownershipOf(actor: CustomerActor, customerReference: string | undefined): MissionOwnership {
  return actor.kind === "BUSINESS"
    ? {
        channel: "PRO_PORTAL",
        businessAccountId: actor.businessAccountId,
        personalCustomerId: null,
        createdByUserId: actor.userId,
        customerReference: customerReference ?? null,
      }
    : {
        channel: "CLIENT_PORTAL",
        businessAccountId: null,
        personalCustomerId: actor.personalCustomerId,
        createdByUserId: actor.userId,
        customerReference: null,
      };
}

export async function placeOrder(
  actor: Actor | null,
  input: unknown,
): Promise<UseCaseResult<{ id: string; reference: string }>> {
  return attempt("placeOrder", async () => {
    assertCustomer(actor, "missions.create");
    const parsed = parseOrder(input);
    if (!parsed.ok) return parsed;
    const order = parsed.data;
    const service = await getMissionService();
    const mission = await service.createFromRequest(
      toMissionRequest(order),
      {
        customer: await customerSnapshot(actor),
        vehicle: { make: order.vehicle.make, model: order.vehicle.model, plate: order.vehicle.plate },
        contacts: { pickup: order.pickupContact, dropoff: order.dropoffContact },
        notes: order.notes,
      },
      {
        status: "CONFIRMED",
        ownership: ownershipOf(actor, order.customerReference),
        createdLabel:
          actor.kind === "BUSINESS" ? `Commande passée par ${actor.name} (espace pro)` : "Commande passée en ligne",
      },
    );
    return ok({ id: mission.id, reference: mission.reference });
  });
}

/** Acceptation d'un devis envoyé par Naera. */
export async function confirmQuotedMission(actor: Actor | null, id: string): Promise<UseCaseResult<{ id: string }>> {
  return run("confirmQuotedMission", async () => {
    assertCustomer(actor, "missions.create");
    const service = await getMissionService();
    const mission = await service.applyAction(id, "CONFIRM", missionScopeFor(actor), (candidate) =>
      canPerformMissionAction(actor, candidate, "CONFIRM"),
    );
    return { id: mission.id };
  });
}

/** Valeurs de départ pour dupliquer une mission du périmètre (nouvelle date à choisir). */
export async function orderPrefill(actor: Actor | null, missionId: string): Promise<CustomerOrderInput | null> {
  assertCustomer(actor, "missions.create");
  const service = await getMissionService();
  const mission = await service.get(missionId, missionScopeFor(actor));
  if (!mission) return null;
  return {
    pickupAddress: mission.request.pickupAddress,
    dropoffAddress: mission.request.dropoffAddress,
    date: today(),
    time: mission.scheduledTime,
    vehicle: {
      category: mission.vehicle.category,
      fuelType: mission.vehicle.fuelType,
      make: mission.vehicle.make,
      model: mission.vehicle.model,
      plate: mission.vehicle.plate,
    },
    optionIds: mission.request.optionIds,
    pickupContact: mission.contacts.pickup ?? undefined,
    dropoffContact: mission.contacts.dropoff ?? undefined,
    customerReference: mission.ownership.customerReference ?? undefined,
  };
}
