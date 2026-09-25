import { z } from "zod";
import { MAX_MARGIN_RATE_PERCENT } from "@/core/pricing/margin";
import {
  FUEL_TYPES,
  OPTIMIZATION_STRATEGIES,
  SELECTABLE_OPTION_IDS,
  VEHICLE_CATEGORIES,
  type FuelType,
  type OptimizationStrategy,
  type SelectableOptionId,
  type VehicleCategory,
} from "@/core/settings/types";
import { isValidLocalDate, isValidTime } from "@/core/shared/calendar";
import type { MissionRequest, TransportPreference } from "@/core/simulation/types";
import { TRANSPORT_MODES } from "@/core/transport/types";

/** Nombre saisi au clavier (virgule acceptée) ; undefined si vide ou invalide. */
export function parseDecimal(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (normalized === "") return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const decimalText = (message: string, { min = 0, max = 100_000 }: { min?: number; max?: number } = {}) =>
  z.string().refine((value) => {
    if (value.trim() === "") return true;
    const parsed = parseDecimal(value);
    return parsed !== undefined && parsed >= min && parsed <= max;
  }, message);

export const newMissionFormSchema = z
  .object({
    pickupAddress: z.string().trim().min(2, "Indique où se trouve le véhicule"),
    dropoffAddress: z.string().trim().min(2, "Indique où livrer le véhicule"),
    date: z.string().refine(isValidLocalDate, "Date invalide"),
    time: z.string().refine(isValidTime, "Heure invalide"),
    vehicleCategory: z.enum(VEHICLE_CATEGORIES),
    fuelType: z.enum(FUEL_TYPES),
    consumption: decimalText("Consommation entre 1 et 60", { min: 1, max: 60 }),
    accessMode: z.enum(["AUTO", ...TRANSPORT_MODES]),
    returnMode: z.enum(["AUTO", ...TRANSPORT_MODES]),
    strategy: z.enum(OPTIMIZATION_STRATEGIES),
    marginMode: z.enum(["SETTINGS", "PERCENT", "FIXED"]),
    marginValue: decimalText("Marge invalide", { max: 5_000 }),
    waitingMin: z.number().int().min(0).max(720),
    optionIds: z.array(z.enum(SELECTABLE_OPTION_IDS)),
    manualAccessPrice: decimalText("Prix invalide", { max: 5_000 }),
    manualAccessDuration: decimalText("Durée invalide", { max: 2_880 }),
    manualReturnPrice: decimalText("Prix invalide", { max: 5_000 }),
    manualReturnDuration: decimalText("Durée invalide", { max: 2_880 }),
  })
  .superRefine((values, ctx) => {
    if (values.marginMode !== "SETTINGS" && parseDecimal(values.marginValue) === undefined) {
      ctx.addIssue({ code: "custom", path: ["marginValue"], message: "Indique la marge souhaitée" });
    }
    const marginValue = parseDecimal(values.marginValue);
    if (values.marginMode === "PERCENT" && marginValue !== undefined && marginValue > MAX_MARGIN_RATE_PERCENT) {
      ctx.addIssue({
        code: "custom",
        path: ["marginValue"],
        message: `Taux de marge sur vente : ${MAX_MARGIN_RATE_PERCENT} % maximum`,
      });
    }
    const requireManual = (
      mode: TransportPreference,
      price: string,
      duration: string,
      prefix: "manualAccess" | "manualReturn",
    ) => {
      if (mode !== "OTHER") return;
      if (parseDecimal(price) === undefined)
        ctx.addIssue({ code: "custom", path: [`${prefix}Price`], message: "Prix requis" });
      if (parseDecimal(duration) === undefined)
        ctx.addIssue({ code: "custom", path: [`${prefix}Duration`], message: "Durée requise" });
    };
    requireManual(values.accessMode, values.manualAccessPrice, values.manualAccessDuration, "manualAccess");
    requireManual(values.returnMode, values.manualReturnPrice, values.manualReturnDuration, "manualReturn");
  });

export type NewMissionFormValues = z.infer<typeof newMissionFormSchema>;

export function defaultFormValues(input: {
  date: string;
  time: string;
  strategy: OptimizationStrategy;
}): NewMissionFormValues {
  return {
    pickupAddress: "",
    dropoffAddress: "",
    date: input.date,
    time: input.time,
    vehicleCategory: "SEDAN" as VehicleCategory,
    fuelType: "PETROL" as FuelType,
    consumption: "",
    accessMode: "AUTO",
    returnMode: "AUTO",
    strategy: input.strategy,
    marginMode: "SETTINGS",
    marginValue: "",
    waitingMin: 0,
    optionIds: [] as SelectableOptionId[],
    manualAccessPrice: "",
    manualAccessDuration: "",
    manualReturnPrice: "",
    manualReturnDuration: "",
  };
}

function manualLeg(mode: TransportPreference, price: string, duration: string) {
  if (mode !== "OTHER") return undefined;
  const parsedPrice = parseDecimal(price);
  const parsedDuration = parseDecimal(duration);
  if (parsedPrice === undefined || parsedDuration === undefined) return undefined;
  return { price: parsedPrice, durationMin: Math.round(parsedDuration) };
}

/** Convertit la saisie du formulaire en demande de simulation (contrat de l'API). */
export function toMissionRequest(
  values: NewMissionFormValues,
  manualRoute?: MissionRequest["manualRoute"],
): MissionRequest {
  const marginValue = parseDecimal(values.marginValue);
  return {
    pickupAddress: values.pickupAddress.trim(),
    dropoffAddress: values.dropoffAddress.trim(),
    date: values.date,
    time: values.time,
    vehicle: {
      category: values.vehicleCategory,
      fuelType: values.fuelType,
      consumptionPer100: parseDecimal(values.consumption),
    },
    accessMode: values.accessMode,
    returnMode: values.returnMode,
    strategy: values.strategy,
    margin:
      values.marginMode === "PERCENT" && marginValue !== undefined
        ? { mode: "PERCENT", percent: marginValue }
        : values.marginMode === "FIXED" && marginValue !== undefined
          ? { mode: "FIXED", amount: marginValue }
          : undefined,
    waitingMin: values.waitingMin,
    optionIds: values.optionIds,
    manualRoute,
    manualAccess: manualLeg(values.accessMode, values.manualAccessPrice, values.manualAccessDuration),
    manualReturn: manualLeg(values.returnMode, values.manualReturnPrice, values.manualReturnDuration),
  };
}
